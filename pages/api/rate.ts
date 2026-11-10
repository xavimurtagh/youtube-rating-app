import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import { getUser } from '../../lib/auth'
import { cleanVideoId } from '../../utils/videoUtils';
import { parseScore } from '../../lib/validation';
import { enforceRateLimit } from '../../lib/rateLimit';

// Add retry utility
async function withRetry(operation, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`Attempt ${i + 1} failed:`, error.message);
      
      if (i === maxRetries - 1) throw error;
      
      // Wait before retrying, with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
}

const triggerCleanupIfNeeded = async () => {
  // Only run cleanup occasionally (1% chance per API call)
  if (Math.random() > 0.01) return;

  try {
    console.log('Triggering automatic activity cleanup...');
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const deleteResult = await prisma.activity.deleteMany({
      where: {
        createdAt: {
          lt: sevenDaysAgo
        }
      }
    });

    if (deleteResult.count > 0) {
      console.log(`Auto-cleaned ${deleteResult.count} old activities`);
    }
  } catch (error) {
    console.error('Auto-cleanup failed (non-critical):', error);
  }
};

export default async function handler(req, res) {
  const me = await getUser(req, res)

  if (!me) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!enforceRateLimit(req, res, { id: `rate:${me.id}`, limit: 60, windowMs: 60_000 })) {
    return
  }

  try {

    triggerCleanupIfNeeded();
    
    if (req.method === 'POST') {
      const { video, score } = req.body

      if (!video?.id || score === undefined || score === null) {
        return res.status(400).json({ error: 'Missing video or score' })
      }

      // Validate the score: it must be an integer between 1 and 10
      // (the Rating.score column is an Int, and the UI only offers 1-10).
      const numericScore = parseScore(score)
      if (numericScore === null) {
        return res.status(400).json({ error: 'Score must be a number between 1 and 10' })
      }

      // Clean the video ID
      const cleanId = cleanVideoId(video.id);
      if (!cleanId) {
        return res.status(400).json({ error: 'Invalid video ID format' });
      }

      // Use retry logic for database operations
      const result = await withRetry(async () => {
        // Ensure video exists first
        await prisma.video.upsert({
          where: { id: cleanId },
          create: {
            id: cleanId,
            title: video.title || 'Unknown Video',
            channel: video.channel || 'Unknown Channel',
            thumbnail: video.thumbnail || null,
            category: video.category || null
          },
          update: {
            ...(video.title && { title: video.title }),
            ...(video.channel && { channel: video.channel }),
            ...(video.thumbnail && { thumbnail: video.thumbnail }),
            ...(video.category && { category: video.category })
          }
        });

        // Create or update rating
        await prisma.rating.upsert({
          where: {
            userId_videoId: {
              userId: me.id,
              videoId: cleanId
            }
          },
          create: {
            userId: me.id,
            videoId: cleanId,
            score: numericScore
          },
          update: {
            score: numericScore,
            ratedAt: new Date()
          }
        });

        // Log the activity. Only the score is stored: the feed reads titles
        // from the Video table, which is kept fresh (YouTube's 30-day rule).
        await prisma.activity.create({
          data: {
            userId: me.id,
            type: 'rating',
            videoId: cleanId,
            data: { score: numericScore },
          },
        });
          
      });

      return res.status(200).json({ success: true, rating: result });
    }

    if (req.method === 'DELETE') {
      const { videoId } = req.body
      
      if (!videoId) {
        return res.status(400).json({ error: 'Missing videoId' })
      }

      console.log('Deleting rating for video:', videoId);

      const result = await withRetry(async () => {
        // Delete the rating
        const deletedRating = await prisma.rating.deleteMany({
          where: {
            userId: me.id,
            videoId: videoId
          }
        });

        // Also remove from favorites if it exists
        await prisma.user.update({
          where: { id: me.id },
          data: {
            favourites: { 
              disconnect: { id: videoId }
            }
          }
        }).catch(() => {
          // Ignore error if video wasn't in favorites
          console.log('Video was not in favorites');
        });

        return deletedRating;
      });

      return res.status(200).json({ 
        success: true, 
        deleted: result.count,
        videoId: videoId
      });
    }

    res.setHeader('Allow', ['POST', 'DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })

  } catch (error) {
    console.error('Rating API error:', error);
    
    // Handle specific database errors
    if (error.code === 'P1001' || error.message.includes("Can't reach database")) {
      return res.status(503).json({ 
        error: 'Database temporarily unavailable. Please try again.',
        retryable: true
      });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
