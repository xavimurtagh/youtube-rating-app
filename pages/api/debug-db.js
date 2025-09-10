import { prisma } from '../../lib/prisma';

export default async function handler(req, res) {
  try {
    // Get sample of video IDs from database
    const videos = await prisma.video.findMany({
      select: { id: true },
      take: 10
    });
    
    const ratings = await prisma.rating.findMany({
      select: { videoId: true },
      take: 10
    });
    
    return res.json({
      videoIds: videos.map(v => ({
        id: v.id,
        length: v.id.length,
        type: typeof v.id,
        isValid: /^[a-zA-Z0-9_-]+$/.test(v.id)
      })),
      ratingVideoIds: ratings.map(r => ({
        videoId: r.videoId,
        length: r.videoId.length,
        type: typeof r.videoId,
        isValid: /^[a-zA-Z0-9_-]+$/.test(r.videoId)
      }))
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
