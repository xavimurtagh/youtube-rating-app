import { google } from 'googleapis';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

// Stable YouTube category IDs → human-readable names (used to enrich Video
// records so recommendations can use category affinity).
const YT_CATEGORIES = {
  '1': 'Film & Animation', '2': 'Autos & Vehicles', '10': 'Music',
  '15': 'Pets & Animals', '17': 'Sports', '18': 'Short Movies',
  '19': 'Travel & Events', '20': 'Gaming', '21': 'Videoblogging',
  '22': 'People & Blogs', '23': 'Comedy', '24': 'Entertainment',
  '25': 'News & Politics', '26': 'Howto & Style', '27': 'Education',
  '28': 'Science & Technology', '29': 'Nonprofits & Activism', '30': 'Movies',
  '31': 'Anime/Animation', '32': 'Action/Adventure', '33': 'Classics',
  '34': 'Comedy', '35': 'Documentary', '36': 'Drama', '37': 'Family',
  '38': 'Foreign', '39': 'Horror', '40': 'Sci-Fi/Fantasy', '41': 'Thriller',
  '43': 'Shows', '44': 'Trailers'
};

export function categoryName(categoryId) {
  return categoryId != null ? (YT_CATEGORIES[String(categoryId)] || null) : null;
}

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

function toVideo(video) {
  return {
    id: video.id,
    title: video.snippet.title,
    channel: video.snippet.channelTitle,
    category: categoryName(video.snippet.categoryId),
    description: '',
    thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url,
    publishedAt: video.snippet.publishedAt,
    duration: video.contentDetails?.duration,
    embeddable: video.status?.embeddable,
    url: `https://www.youtube.com/watch?v=${video.id}`,
    channelId: video.snippet.channelId
  };
}

/**
 * Details for many videos at once. videos.list accepts up to 50 ids per call
 * and costs the same single quota unit regardless, so always batch.
 * Returns a Map of id → video (missing/removed videos are simply absent).
 */
export async function getVideosDetails(videoIds) {
  const ids = Array.from(new Set(videoIds.filter(Boolean)));
  const found = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const response = await youtube.videos.list({
      part: ['snippet', 'contentDetails', 'status'],
      id: ids.slice(i, i + 50)
    });
    for (const item of response.data.items || []) found.set(item.id, toVideo(item));
  }
  return found;
}

export async function getVideoDetails(videoId) {
  try {
    const found = await getVideosDetails([videoId]);
    const video = found.get(videoId);
    if (!video) throw new Error('Video not found');
    return video;
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
