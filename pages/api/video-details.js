import { getVideoDetails } from '../../utils/youtube';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { videoIds } = req.body;
  
  if (!Array.isArray(videoIds) || videoIds.length === 0) {
    return res.status(400).json({ error: 'videoIds array required' });
  }

  try {
    const videoDetails = [];
    
    // Process in batches to avoid rate limits
    for (const videoId of videoIds) {
      try {
        const details = await getVideoDetails(videoId);
        videoDetails.push({
          id: details.id,
          title: details.title,
          channel: details.channel,
          thumbnail: details.thumbnail,
          description: '',
          isMusic: false, // You can enhance this logic
        });
      } catch (error) {
        console.error(`Failed to fetch details for video ${videoId}:`, error);
        // Fallback for videos that can't be found
        videoDetails.push({
          id: videoId,
          title: 'Previously Rated Video',
          channel: 'Unknown Channel',
          thumbnail: null,
          isMusic: false,
        });
      }
    }

    res.status(200).json({ videos: videoDetails });
  } catch (error) {
    console.error('Video details API error:', error);
    res.status(500).json({ error: 'Failed to fetch video details' });
  }
}
