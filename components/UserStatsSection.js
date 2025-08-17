import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

function calculateUserStats(videos, ratings) {
  if (!videos.length) return null;

  // Channel statistics
  const channelCounts = {};
  const channelRatings = {};
  
  // Genre detection from video titles and channels
  const genreKeywords = {
    music: ['music', 'song', 'band', 'artist', 'album', 'concert'],
    gaming: ['gaming', 'gameplay', 'game', 'playthrough'],
    education: ['tutorial', 'how to', 'learn', 'education'],
    entertainment: ['comedy', 'funny', 'entertainment', 'show'],
    tech: ['tech', 'technology', 'review', 'unboxing'],
    sports: ['sports', 'football', 'basketball', 'soccer'],
  };
  
  const genreCounts = {};
  const genreRatings = {};
  
  let totalWatchTime = 0;
  let ratedVideosCount = 0;
  let totalRating = 0;
  let favoriteVideo = null;
  let highestRating = 0;

  videos.forEach(video => {
    // Channel stats
    const channel = video.channel || 'Unknown';
    channelCounts[channel] = (channelCounts[channel] || 0) + 1;
    
    // Rating stats
    const rating = ratings[video.id]?.rating;
    if (rating) {
      if (!channelRatings[channel]) channelRatings[channel] = [];
      channelRatings[channel].push(rating);
      
      ratedVideosCount++;
      totalRating += rating;
      
      if (rating > highestRating) {
        highestRating = rating;
        favoriteVideo = video;
      }
    }
    
    // Genre detection
    const title = (video.title || '').toLowerCase();
    const channelName = channel.toLowerCase();
    const searchText = `${title} ${channelName}`;
    
    Object.keys(genreKeywords).forEach(genre => {
      const keywords = genreKeywords[genre];
      const hasKeyword = keywords.some(keyword => searchText.includes(keyword));
      
      if (hasKeyword) {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        if (rating) {
          if (!genreRatings[genre]) genreRatings[genre] = [];
          genreRatings[genre].push(rating);
        }
      }
    });

    // Estimate watch time
    if (video.watchedAt) {
      totalWatchTime += 300; // Assume average 5 minutes per video
    }
  });

  // Calculate top channels and genres
  const topChannels = Object.entries(channelCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([channel, count]) => ({
      name: channel,
      videoCount: count,
      averageRating: channelRatings[channel] 
        ? Math.round((channelRatings[channel].reduce((a, b) => a + b, 0) / channelRatings[channel].length) * 10) / 10
        : null
    }));

  const topGenres = Object.entries(genreCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([genre, count]) => ({
      name: genre.charAt(0).toUpperCase() + genre.slice(1),
      videoCount: count,
      averageRating: genreRatings[genre]
        ? Math.round((genreRatings[genre].reduce((a, b) => a + b, 0) / genreRatings[genre].length) * 10) / 10
        : null
    }));

  return {
    totalVideos: videos.length,
    ratedVideos: ratedVideosCount,
    averageRating: ratedVideosCount > 0 ? Math.round((totalRating / ratedVideosCount) * 10) / 10 : 0,
    estimatedWatchTimeHours: Math.round(totalWatchTime / 60),
    favoriteVideo,
    topChannels,
    topGenres,
  };
}

export default function UserStatsSection({ videos, ratings }) {
  const { data: session } = useSession();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (videos.length > 0) {
      const calculatedStats = calculateUserStats(videos, ratings);
      setStats(calculatedStats);
    }
  }, [videos, ratings]);

  if (!session) {
    return (
      <div className="auth-required">
        <div className="auth-prompt">
          <h2>🔐 Sign In Required</h2>
          <p>Sign in to view your personalized YouTube statistics and insights.</p>
        </div>
      </div>
    );
  }

  if (!stats || stats.totalVideos === 0) {
    return (
      <div className="empty-state">
        <h3>📊 No Statistics Available</h3>
        <p>Import your YouTube watch history to see detailed statistics about your viewing habits!</p>
      </div>
    );
  }

  return (
    <div className="stats-section">
      <div className="stats-header">
        <h2>📊 Your YouTube Statistics</h2>
        <p className="section-description">
          Insights into your YouTube viewing habits and preferences
        </p>
      </div>

      {/* Overview Stats */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-number">{stats.totalVideos}</div>
          <div className="stat-label">Total Videos</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.ratedVideos}</div>
          <div className="stat-label">Videos Rated</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.averageRating}</div>
          <div className="stat-label">Average Rating</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.estimatedWatchTimeHours}h</div>
          <div className="stat-label">Est. Watch Time</div>
        </div>
      </div>

      {/* Favorite Video */}
      {stats.favoriteVideo && (
        <div className="stats-card">
          <h3>⭐ Your Highest Rated Video</h3>
          <div className="favorite-video">
            <div className="video-info">
              {stats.favoriteVideo.thumbnail && (
                <img 
                  src={stats.favoriteVideo.thumbnail} 
                  alt={stats.favoriteVideo.title}
                  className="video-thumbnail"
                />
              )}
              <div className="video-details">
                <h4>{stats.favoriteVideo.title}</h4>
                <p>{stats.favoriteVideo.channel}</p>
                <div className="rating-display">
                  <span className="rating-number">{ratings[stats.favoriteVideo.id]?.rating}</span>
                  <span className="rating-label">/10</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Channels */}
      <div className="stats-card">
        <h3>📺 Top Channels</h3>
        <div className="top-list">
          {stats.topChannels.map((channel, index) => (
            <div key={channel.name} className="top-item">
              <div className="rank">#{index + 1}</div>
              <div className="item-details">
                <div className="item-name">{channel.name}</div>
                <div className="item-stats">
                  {channel.videoCount} videos
                  {channel.averageRating && (
                    <span className="item-rating"> • Avg: {channel.averageRating}/10</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Genres */}
      <div className="stats-card">
        <h3>🎬 Content Preferences</h3>
        <div className="top-list">
          {stats.topGenres.map((genre, index) => (
            <div key={genre.name} className="top-item">
              <div className="rank">#{index + 1}</div>
              <div className="item-details">
                <div className="item-name">{genre.name}</div>
                <div className="item-stats">
                  {genre.videoCount} videos
                  {genre.averageRating && (
                    <span className="item-rating"> • Avg: {genre.averageRating}/10</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
