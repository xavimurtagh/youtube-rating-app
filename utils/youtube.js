import { google } from 'googleapis';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

export async function searchVideos(query, maxResults = 20) {
  try {
    const response = await youtube.search.list({
      part: ['snippet'],
      q: query,
      type: 'video',
      maxResults: maxResults,
      order: 'relevance'
    });

    return response.data.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.medium?.url,
      publishedAt: item.snippet.publishedAt,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`
    }));
  } catch (error) {
    console.error('YouTube API Error:', error);
    throw new Error('Failed to search videos');
  }
}

export async function getVideoDetails(videoId) {
  try {
    const response = await youtube.videos.list({
      part: ['snippet', 'statistics'],
      id: [videoId]
    });

    const video = response.data.items[0];
    if (!video) throw new Error('Video not found');

    return {
      id: video.id,
      title: video.snippet.title,
      channel: video.snippet.channelTitle,
      description: video.snippet.description,
      thumbnail: video.snippet.thumbnails.medium?.url,
      publishedAt: video.snippet.publishedAt,
      viewCount: video.statistics.viewCount,
      likeCount: video.statistics.likeCount,
      url: `https://www.youtube.com/watch?v=${video.id}`
    };
  } catch (error) {
    console.error('YouTube API Error:', error);
    throw new Error('Failed to get video details');
  }
}
