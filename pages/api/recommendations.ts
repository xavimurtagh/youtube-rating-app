import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import { getUser } from '../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const me = await getUser(req, res)
  if (!me) return res.status(401).json({ error: 'Unauthorized' })

  // Fetch user ratings
  const myRatings = await prisma.rating.findMany({
    where: { userId: me.id }
  })

  // Log count for debugging
  console.log(`User ${me.id} has ${myRatings.length} ratings`)

  // Require at least 10 ratings
  if (myRatings.length < 10) {
    return res.status(400).json({ error: `Need at least 10 ratings (you have ${myRatings.length})` })
  }

  // Find similar users using collaborative filtering
  const similarUsers = await findSimilarUsers(me.id, myRatings);
  
  if (similarUsers.length === 0) {
    return res.status(200).json({ recommendations: [] });
  }

  try {

    // Get recommendations from similar users
    const recommendations = await generateRecommendations(me.id, similarUsers, myRatings);
  
    return res.status(200).json({ recommendations });
  } catch (error) {
    console.error('Recommendations API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}


async function findSimilarUsers(userId: string, myRatings: any[]) {
  // Get all users who have rated videos in common with me
  const myVideoIds = myRatings.map(r => r.videoId);
  
  const otherUsersRatings = await prisma.rating.findMany({
    where: {
      AND: [
        { userId: { not: userId } },
        { videoId: { in: myVideoIds } }
      ]
    },
    include: {
      user: { select: { id: true, name: true } }
    }
  });

  // Group by user
  const userRatingsMap: Record<string, any[]> = {};
  otherUsersRatings.forEach(rating => {
    if (!userRatingsMap[rating.userId]) {
      userRatingsMap[rating.userId] = [];
    }
    userRatingsMap[rating.userId].push(rating);
  });

  // Calculate similarity scores using Pearson correlation
  const similarities = Object.entries(userRatingsMap).map(([otherUserId, theirRatings]) => {
    const commonVideos = theirRatings.filter(r => 
      myRatings.some(myR => myR.videoId === r.videoId)
    );

    if (commonVideos.length < 3) return null; // Need at least 3 common ratings

    const similarity = calculatePearsonCorrelation(
      myRatings.filter(r => commonVideos.some(c => c.videoId === r.videoId)),
      commonVideos
    );

    return {
      userId: otherUserId,
      similarity,
      commonRatings: commonVideos.length,
      user: theirRatings[0].user
    };
  }).filter(Boolean);

  // Sort by similarity and return top similar users
  return similarities
    .sort((a, b) => b!.similarity - a!.similarity)
    .slice(0, 10);
}

function calculatePearsonCorrelation(ratings1: any[], ratings2: any[]) {
  // Simple Pearson correlation coefficient calculation
  const n = ratings1.length;
  if (n === 0) return 0;

  const sum1 = ratings1.reduce((sum, r) => sum + r.score, 0);
  const sum2 = ratings2.reduce((sum, r) => sum + r.score, 0);
  
  const sum1Sq = ratings1.reduce((sum, r) => sum + r.score * r.score, 0);
  const sum2Sq = ratings2.reduce((sum, r) => sum + r.score * r.score, 0);
  
  const sumProducts = ratings1.reduce((sum, r, i) => {
    const correspondingRating = ratings2.find(r2 => r2.videoId === r.videoId);
    return sum + (correspondingRating ? r.score * correspondingRating.score : 0);
  }, 0);

  const numerator = sumProducts - (sum1 * sum2 / n);
  const denominator = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

async function generateRecommendations(userId: string, similarUsers: any[], myRatings: any[]) {
  const myVideoIds = myRatings.map(r => r.videoId);
  const similarUserIds = similarUsers.map(u => u.userId);

  // Get highly rated videos from similar users that I haven't seen
  const candidateRatings = await prisma.rating.findMany({
    where: {
      AND: [
        { userId: { in: similarUserIds } },
        { videoId: { notIn: myVideoIds } },
        { score: { gte: 7 } } // Only recommend videos rated 7+
      ]
    },
    include: {
      video: true,
      user: { select: { id: true, name: true } }
    }
  });

  // Score recommendations based on similarity of recommenders
  const videoScores: Record<string, any> = {};
  
  candidateRatings.forEach(rating => {
    const recommender = similarUsers.find(u => u.userId === rating.userId);
    if (!recommender) return;

    if (!videoScores[rating.videoId]) {
      videoScores[rating.videoId] = {
        video: rating.video,
        totalScore: 0,
        weightedScore: 0,
        recommenderCount: 0,
        avgRating: 0,
        reasons: []
      };
    }

    const weightedContribution = rating.score * recommender.similarity;
    videoScores[rating.videoId].totalScore += rating.score;
    videoScores[rating.videoId].weightedScore += weightedContribution;
    videoScores[rating.videoId].recommenderCount++;
    videoScores[rating.videoId].reasons.push({
      user: recommender.user.name,
      rating: rating.score,
      similarity: Math.round(recommender.similarity * 100)
    });
  });

  // Convert to recommendations with match scores
  const recommendations = Object.values(videoScores)
    .map((rec: any) => {
      const avgRating = rec.totalScore / rec.recommenderCount;
      const matchScore = Math.min(Math.round(rec.weightedScore * 10), 100);
      
      return {
        video: rec.video,
        matchScore,
        avgRating: Math.round(avgRating * 10) / 10,
        recommenderCount: rec.recommenderCount,
        reason: generateReasonText(rec.reasons, avgRating)
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 20);

  return recommendations;
}

function generateReasonText(reasons: any[], avgRating: number) {
  const topReasons = reasons
    .sort((a, b) => (b.rating * b.similarity) - (a.rating * a.similarity))
    .slice(0, 3);
  
  const reasonText = topReasons
    .map(r => `${r.user} (${r.similarity}% similar) rated it ${r.rating}/10`)
    .join(', ');
  
  return `Users similar to you gave this an average of ${avgRating}/10. ${reasonText}`;
}
