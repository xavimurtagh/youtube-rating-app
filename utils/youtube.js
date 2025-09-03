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
      order: 'relevance',
      safeSearch: 'moderate'
    });

    return response.data.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      description: '',
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      publishedAt: item.snippet.publishedAt,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      channelId: item.snippet.channelId
    }));
  } catch (error) {
    console.error('YouTube API Error:', error);
    throw new Error(`Failed to search videos: ${error.message}`);
  }
}

export async function getVideoDetails(videoId) {
  try {
    const response = await youtube.videos.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: [videoId]
    });

    const video = response.data.items[0];
    if (!video) throw new Error('Video not found');

    return {
      id: video.id,
      title: video.snippet.title,
      channel: video.snippet.channelTitle,
      description: '',
      thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url,
      publishedAt: video.snippet.publishedAt,
      viewCount: video.statistics?.viewCount,
      likeCount: video.statistics?.likeCount,
      duration: video.contentDetails?.duration,
      url: `https://www.youtube.com/watch?v=${video.id}`,
      channelId: video.snippet.channelId
    };
  } catch (error) {
    console.error('YouTube API Error:', error);
    throw new Error(`Failed to get video details: ${error.message}`);
  }
}

// Helper function to format ISO 8601 duration to readable format
export function formatDuration(isoDuration) {
  if (!isoDuration) return null;

  const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return null;

  const hours = (match[1] || '').replace('H', '');
  const minutes = (match[2] || '').replace('M', '');
  const seconds = (match[3] || '').replace('S', '');

  let formatted = '';
  if (hours) formatted += `${hours}:`;
  formatted += `${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;

  return formatted;
}


export const fetchVideoDetails = async (videoIds) => {
  if (!Array.isArray(videoIds) || videoIds.length === 0) return [];
  
  try {
    const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    if (!API_KEY) throw new Error('YouTube API key not configured');
    
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoIds.join(',')}&part=snippet&key=${API_KEY}`
    );
    
    if (!response.ok) throw new Error('Failed to fetch from YouTube API');
    
    const data = await response.json();
    
    return data.items.map(item => ({
      id: item.id,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium?.url,
      isMusic: false, 
    }));
  } catch (error) {
    console.error('Error fetching video details:', error);
    return videoIds.map(id => ({
      id,
      title: 'Previously Rated Video',
      channel: 'Unknown Channel', 
      thumbnail: null,
      isMusic: false,
    }));
  }
};
