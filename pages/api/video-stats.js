import { prisma } from '../../lib/prisma';
import { cleanVideoId } from '../../utils/videoUtils';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { videoId: rawVideoId } = req.query;
    
    if (!rawVideoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    
    console.log('Stats request for video ID:', rawVideoId);
    
    // Clean the video ID
    const id = cleanVideoId(rawVideoId);
    
    if (!id) {
      console.warn('Invalid video ID format:', rawVideoId);
      // For existing malformed data, try to extract a valid ID
      let fallbackId = rawVideoId;
      if (typeof rawVideoId === 'string' && rawVideoId.length >= 11) {
        const match = rawVideoId.match(/[a-zA-Z0-9_-]{11}/);
        if (match) {
          fallbackId = match;
          console.log('Using fallback ID:', fallbackId);
        }
      }
      
      if (!fallbackId || fallbackId.length !== 11) {
        return res.status(400).json({ 
          error: 'Invalid video ID format',
          received: rawVideoId
        });
      }
      
      // Use the fallback ID
      videoId = fallbackId;
    }

    // Get all ratings for this video
    const ratings = await prisma.rating.findMany({
      where: { videoId },
      select: { score: true }
    });

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

    res.status(200).json({
      totalRatings,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution
    });
    
  } catch (error) {
    console.error('Video stats API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}
