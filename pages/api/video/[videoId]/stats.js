import { prisma } from '../../../../lib/prisma';
import { cleanVideoId } from '../../../../utils/videoUtils';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { videoId: rawVideoId } = req.query;
    
    console.log('Stats request for video ID:', rawVideoId);
    
    // Clean the video ID
    const videoId = cleanVideoId(rawVideoId);
    
    if (!videoId) {
      console.warn('Invalid video ID format:', rawVideoId);
      return res.status(400).json({ 
        error: 'Invalid video ID format',
        received: rawVideoId,
        cleaned: videoId
      });
    }

    console.log('Cleaned video ID:', videoId);

    // Get all ratings for this video
    const ratings = await prisma.rating.findMany({
      where: { videoId },
      select: { score: true }
    });

    console.log(`Found ${ratings.length} ratings for video ${videoId}`);

    if (ratings.length === 0) {
      return res.status(200).json({
        totalRatings: 0,
        averageRating: null,
        ratingDistribution: {}
      });
    }

    const totalRatings = ratings.length;
    const averageRating = ratings.reduce((sum, r) => sum + r.score, 0) / totalRatings;
    
    // Calculate rating distribution
    const ratingDistribution = {};
    for (let i = 1; i <= 10; i++) {
      ratingDistribution[i] = ratings.filter(r => Math.floor(r.score) === i).length;
    }

    const result = {
      totalRatings,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution
    };

    console.log('Returning stats:', result);

    res.status(200).json(result);
    
  } catch (error) {
    console.error('Video stats API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
