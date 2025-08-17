import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function UserStatsSection({ videos, ratings }) {
  const { data: session } = useSession();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (videos.length > 0) {
      const calculatedStats = calculateUserStats(videos, ratings);
      setStats(calculatedStats);
    }
  }, [videos, ratings]);

  // Helper to get rating value (handle both old and new format)
  const getRatingValue = (videoId) => {
    const rating = ratings[videoId];
    if (!rating) return null;
    return typeof rating === 'object' ? rating.rating : rating;
  };

  function calculateUserStats(videos, ratings) {
    if (!videos.length) return null;

    // Separate music and regular videos
    const musicVideos = videos.filter(v => v.isMusic || isMusicVideo(v));
    const regularVideos = videos.filter(v => !(v.isMusic || isMusicVideo(v)));
    const ignoredVideos = videos.filter(v => v.ignored);

    // Rating statistics
    const ratedVideos = videos.filter(v => getRatingValue(v.id) !== null);
    const ratingValues = ratedVideos.map(v => getRatingValue(v.id)).filter(r => r !== null);

    const totalRating = ratingValues.reduce((sum, r) => sum + Number(r), 0);
    const averageRating = ratingValues.length > 0 ? 
      Math.round((totalRating / ratingValues.length) * 10) / 10 : 0;

    // Channel statistics
    const channelCounts = {};
    const channelRatings = {};

    videos.forEach(video => {
      const channel = video.channel || 'Unknown';
      channelCounts[channel] = (channelCounts[channel] || 0) + 1;

      const rating = getRatingValue(video.id);
      if (rating) {
        if (!channelRatings[channel]) channelRatings[channel] = [];
        channelRatings[channel].push(rating);
      }
    });

    // Genre detection
    const genreStats = calculateGenreStats(videos, ratings);

    // Rating distribution
    const ratingDistribution = {};
    ratingValues.forEach(rating => {
      ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
    });

    // Top and bottom rated videos
    const ratedVideosList = ratedVideos.map(v => ({
      ...v,
      rating: getRatingValue(v.id)
    })).sort((a, b) => b.rating - a.rating);

    const topRatedVideos = ratedVideosList.slice(0, 5);
    const bottomRatedVideos = ratedVideosList.slice(-5).reverse();

    // Viewing patterns
    const watchTimeEstimate = videos.filter(v => v.watchedAt).length * 5; // 5 min average
    const videosPerMonth = calculateVideosPerMonth(videos);

    // Top channels
    const topChannels = Object.entries(channelCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([channel, count]) => ({
        name: channel,
        videoCount: count,
        averageRating: channelRatings[channel] 
          ? Math.round((channelRatings[channel].reduce((a, b) => a + b, 0) / channelRatings[channel].length) * 10) / 10
          : null
      }));

    return {
      overview: {
        totalVideos: videos.length,
        musicVideos: musicVideos.length,
        regularVideos: regularVideos.length,
        ignoredVideos: ignoredVideos.length,
        ratedVideos: ratedVideos.length,
        averageRating,
        estimatedWatchTimeHours: Math.round(watchTimeEstimate / 60),
        completionRate: videos.length > 0 ? Math.round((ratedVideos.length / (videos.length - ignoredVideos.length)) * 100) : 0
      },
      ratingDistribution,
      topRatedVideos,
      bottomRatedVideos,
      topChannels,
      genreStats,
      videosPerMonth,
      watchingHabits: calculateWatchingHabits(videos)
    };
  }

  function isMusicVideo(video) {
    const text = `${video.title || ''} ${video.channel || ''}`.toLowerCase();
    return /music|song|album|artist|official music video|vevo|records/i.test(text);
  }

  function calculateGenreStats(videos, ratings) {
    const genreKeywords = {
      gaming: ['gaming', 'gameplay', 'game', 'playthrough'],
      education: ['tutorial', 'how to', 'learn', 'education'],
      entertainment: ['comedy', 'funny', 'entertainment', 'show'],
      tech: ['tech', 'technology', 'review', 'unboxing'],
      sports: ['sports', 'football', 'basketball', 'soccer'],
      news: ['news', 'breaking', 'report', 'politics'],
      lifestyle: ['vlog', 'lifestyle', 'fashion', 'beauty'],
      science: ['science', 'physics', 'chemistry', 'space']
    };

    const genreStats = {};

    videos.forEach(video => {
      const title = (video.title || '').toLowerCase();
      const channel = (video.channel || '').toLowerCase();
      const searchText = `${title} ${channel}`;

      for (const [genre, keywords] of Object.entries(genreKeywords)) {
        if (keywords.some(keyword => searchText.includes(keyword))) {
          if (!genreStats[genre]) {
            genreStats[genre] = { count: 0, ratings: [] };
          }
          genreStats[genre].count++;

          const rating = getRatingValue(video.id);
          if (rating) {
            genreStats[genre].ratings.push(rating);
          }
          break;
        }
      }
    });

    return Object.entries(genreStats)
      .map(([genre, data]) => ({
        name: genre.charAt(0).toUpperCase() + genre.slice(1),
        videoCount: data.count,
        averageRating: data.ratings.length > 0 ?
          Math.round((data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length) * 10) / 10 : null
      }))
      .sort((a, b) => b.videoCount - a.videoCount)
      .slice(0, 8);
  }

  function calculateVideosPerMonth(videos) {
    const monthCounts = {};

    videos.filter(v => v.watchedAt).forEach(video => {
      const date = new Date(video.watchedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    });

    return Object.entries(monthCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12) // Last 12 months
      .map(([month, count]) => ({ month, count }));
  }

  function calculateWatchingHabits(videos) {
    const watchedVideos = videos.filter(v => v.watchedAt);
    if (watchedVideos.length === 0) return null;

    const hourCounts = {};
    const dayOfWeekCounts = {};

    watchedVideos.forEach(video => {
      const date = new Date(video.watchedAt);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();

      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1;
    });

    const peakHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0];

    const peakDay = Object.entries(dayOfWeekCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0];

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      peakHour: peakHour ? `${peakHour}:00` : null,
      peakDay: peakDay ? dayNames[peakDay] : null,
      totalDaysActive: new Set(watchedVideos.map(v => new Date(v.watchedAt).toDateString())).size
    };
  }

  if (!session) {
    return (
      <div className="auth-required">
        <div className="auth-prompt">
          <h2>📊 Sign In to View Statistics</h2>
          <p>Sign in to see detailed analytics about your YouTube viewing habits.</p>
        </div>
      </div>
    );
  }

  if (!stats || stats.overview.totalVideos === 0) {
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
          Comprehensive insights into your YouTube viewing habits and preferences
        </p>
      </div>

      {/* Overview Stats */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-number">{stats.overview.totalVideos}</div>
          <div className="stat-label">Total Videos</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.overview.ratedVideos}</div>
          <div className="stat-label">Rated Videos</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.overview.averageRating}</div>
          <div className="stat-label">Average Rating</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.overview.completionRate}%</div>
          <div className="stat-label">Rating Progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.overview.estimatedWatchTimeHours}h</div>
          <div className="stat-label">Est. Watch Time</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.overview.musicVideos}</div>
          <div className="stat-label">Music Videos</div>
        </div>
      </div>

      {/* Top Rated Videos */}
      {stats.topRatedVideos.length > 0 && (
        <div className="stats-card">
          <h3>⭐ Your Top Rated Videos</h3>
          <div className="top-videos-list">
            {stats.topRatedVideos.map((video, index) => (
              <div key={video.id} className="top-video-item">
                <div className="rank">#{index + 1}</div>
                <div className="video-details">
                  <div className="video-title">{video.title}</div>
                  <div className="video-channel">{video.channel}</div>
                </div>
                <div className="rating-badge">{video.rating}/10</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rating Distribution */}
      {Object.keys(stats.ratingDistribution).length > 0 && (
        <div className="stats-card">
          <h3>📈 Rating Distribution</h3>
          <div className="rating-chart">
            {Object.entries(stats.ratingDistribution)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([rating, count]) => (
                <div key={rating} className="rating-bar">
                  <span className="rating-label">{rating}/10</span>
                  <div className="bar-container">
                    <div 
                      className="bar-fill" 
                      style={{ 
                        width: `${(count / Math.max(...Object.values(stats.ratingDistribution))) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <span className="rating-count">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Top Channels */}
      <div className="stats-card">
        <h3>📺 Top Channels</h3>
        <div className="top-list">
          {stats.topChannels.slice(0, 5).map((channel, index) => (
            <div key={channel.name} className="top-item">
              <div className="rank">#{index + 1}</div>
              <div className="item-details">
                <div className="item-name">{channel.name}</div>
                <div className="item-stats">
                  {channel.videoCount} videos
                  {channel.averageRating && (
                    <span> • Avg: {channel.averageRating}/10</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Genre Preferences */}
      {stats.genreStats.length > 0 && (
        <div className="stats-card">
          <h3>🎬 Content Preferences</h3>
          <div className="top-list">
            {stats.genreStats.slice(0, 5).map((genre, index) => (
              <div key={genre.name} className="top-item">
                <div className="rank">#{index + 1}</div>
                <div className="item-details">
                  <div className="item-name">{genre.name}</div>
                  <div className="item-stats">
                    {genre.videoCount} videos
                    {genre.averageRating && (
                      <span> • Avg: {genre.averageRating}/10</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Watching Habits */}
      {stats.watchingHabits && (
        <div className="stats-card">
          <h3>⏰ Watching Habits</h3>
          <div className="habits-grid">
            <div className="habit-item">
              <div className="habit-label">Most Active Hour</div>
              <div className="habit-value">{stats.watchingHabits.peakHour || 'N/A'}</div>
            </div>
            <div className="habit-item">
              <div className="habit-label">Most Active Day</div>
              <div className="habit-value">{stats.watchingHabits.peakDay || 'N/A'}</div>
            </div>
            <div className="habit-item">
              <div className="habit-label">Active Days</div>
              <div className="habit-value">{stats.watchingHabits.totalDaysActive}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
