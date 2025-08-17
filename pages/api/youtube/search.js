import { searchVideos } from '../../../utils/youtube';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { q: query, maxResults = 20 } = req.query;

  if (!query) {
    return res.status(400).json({ message: 'Query parameter is required' });
  }

  try {
    const videos = await searchVideos(query, parseInt(maxResults));
    res.status(200).json({ videos, total: videos.length });
  } catch (error) {
    console.error('Search API Error:', error);
    res.status(500).json({ message: 'Failed to search videos' });
  }
}
