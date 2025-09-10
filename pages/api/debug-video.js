import { prisma } from '../../lib/prisma';
import { cleanVideoId } from '../../utils/videoUtils';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { videoId: rawVideoId } = req.query;
    
    const debug = {
      input: rawVideoId,
      type: typeof rawVideoId,
      length: rawVideoId?.length,
      cleaned: cleanVideoId(rawVideoId),
      timestamp: new Date().toISOString()
    };

    // Check if video exists in database
    const videoExists = await prisma.video.findUnique({
      where: { id: rawVideoId }
    });

    const cleanedVideoExists = debug.cleaned ? await prisma.video.findUnique({
      where: { id: debug.cleaned }
    }) : null;

    // Get all ratings for both IDs
    const ratingsRaw = await prisma.rating.findMany({
      where: { videoId: rawVideoId },
      select: { score: true, videoId: true }
    });

    const ratingsCleaned = debug.cleaned ? await prisma.rating.findMany({
      where: { videoId: debug.cleaned },
      select: { score: true, videoId: true }
    }) : [];

    res.status(200).json({
      debug,
      database: {
        videoExists: !!videoExists,
        cleanedVideoExists: !!cleanedVideoExists,
        ratingsForRawId: ratingsRaw.length,
        ratingsForCleanedId: ratingsCleaned.length,
        rawRatings: ratingsRaw,
        cleanedRatings: ratingsCleaned
      }
    });
    
  } catch (error) {
    console.error('Debug API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}
