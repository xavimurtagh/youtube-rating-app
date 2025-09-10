import { prisma } from '../../../../lib/prisma';
import { cleanVideoId, directVideoId } from '../../../../utils/videoUtils';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { videoId: rawVideoId } = req.query;
    
    console.log('=== VIDEO STATS API ===');
    console.log('Raw video ID:', rawVideoId);
    console.log('Type:', typeof rawVideoId);
    console.log('Length:', rawVideoId?.length);
    
    // Try cleaning first
    let videoId = cleanVideoId(rawVideoId);
    console.log('Cleaned video ID:', videoId);
    
    // If cleaning failed, try direct validation
    if (!videoId) {
      videoId = directVideoId(rawVideoId);
      console.log('Direct video ID:', videoId);
    }
    
    // If both failed, try the raw ID if it looks valid
    if (!videoId && typeof rawVideoId === 'string' && rawVideoId.length === 11) {
      if (/^[a-zA-Z0-9_-]+$/.test(rawVideoId)) {
        videoId = rawVideoId;
        console.log('Using raw video ID:', videoId);
      }
    }
    
    if (!videoId) {
      console.error('All video ID methods failed for:', rawVideoId);
      return res.status(400).json({ 
        error: 'Invalid video ID format',
        received: rawVideoId,
        cleaned: cleanVideoId(rawVideoId),
        direct: directVideoId(rawVideoId),
        debug: {
          type: typeof rawVideoId,
          length: rawVideoId?.length,
          sample: rawVideoId?.substring(0, 5)
        }
      });
    }

    console.log('Using video ID for database query:', videoId);

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
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('Video stats API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
