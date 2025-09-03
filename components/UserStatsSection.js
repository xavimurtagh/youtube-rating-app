import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function UserStatsSection({ videos, ratings }) {
  const { data: session } = useSession();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (videos.length > 0 && ratings) {
      const calculatedStats = calculateEnhancedStats(videos, ratings);
      setStats(calculatedStats);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [videos, ratings]);

  // Helper to get rating value
  const getRatingValue = (videoId) => {
    const rating = ratings[videoId];
    if (!rating) return null;
    return typeof rating === 'object' ? rating.rating : rating;
  };

  // Safe calculation of derived values ONLY when stats exists
  const totalRatings = stats?.overview?.ratedVideos || 0;
  const averageRating = stats?.overview?.averageRating || 0;
  
  // Get rating distribution from stats (calculated internally)
  const ratingDistribution = stats?.ratingDistribution || {};

  function calculateEnhancedStats(videos, ratings) {
    if (!videos.length) return null;

    // Basic stats
    const musicVideos = videos.filter(v => v.isMusic || isMusicVideo(v));
    const regularVideos = videos.filter(v => !(v.isMusic || isMusicVideo(v)));
    const ratedVideos = videos.filter(v => getRatingValue(v.id) !== null);
    const ratingValues = ratedVideos.map(v => getRatingValue(v.id)).filter(r => r !== null);

    // Channel statistics with watch counts
    const channelStats = {};
    videos.forEach(video => {
      const channel = video.channel || 'Unknown';
      if (!channelStats[channel]) {
        channelStats[channel] = {
          watchCount: 0,
          ratings: [],
          totalWatchTime: 0,
          videos: []
        };
      }
      channelStats[channel].watchCount++;
      channelStats[channel].videos.push(video);
      channelStats[channel].totalWatchTime += estimateWatchTime(video);

      const rating = getRatingValue(video.id);
      if (rating) {
        channelStats[channel].ratings.push(rating);
      }
    });

    // Most watched channels
    const mostWatchedChannels = Object.entries(channelStats)
      .sort(([,a], [,b]) => b.watchCount - a.watchCount)
      .slice(0, 10)
      .map(([channel, data]) => ({
        name: channel,
        watchCount: data.watchCount,
        totalWatchTime: Math.round(data.totalWatchTime / 60), // hours
        averageRating: data.ratings.length > 0 
          ? Math.round((data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length) * 10) / 10 
          : null
      }));

    // Watch time per month/year
    const monthlyStats = calculateMonthlyStats(videos);
    const yearlyStats = calculateYearlyStats(videos);

    // Top 5 favorites (highest rated videos)
    const topFavorites = ratedVideos
      .map(v => ({ ...v, rating: getRatingValue(v.id) }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);

    // Rating distribution - PROPERLY CALCULATED
    const ratingDistribution = {};
    for (let i = 1; i <= 10; i++) {
      ratingDistribution[i] = 0;
    }
    
    ratingValues.forEach(rating => {
      const score = Math.floor(rating);
      if (score >= 1 && score <= 10) {
        ratingDistribution[score]++;
      }
    });

    // Total estimated watch time
    const totalWatchTimeMinutes = videos.reduce((sum, v) => sum + estimateWatchTime(v), 0);

    return {
      overview: {
        totalVideos: videos.length,
        musicVideos: musicVideos.length,
        regularVideos: regularVideos.length,
        ratedVideos: ratedVideos.length,
        averageRating: ratingValues.length > 0 
          ? Math.round((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length) * 10) / 10 
          : 0,
        totalWatchTimeHours: Math.round(totalWatchTimeMinutes / 60),
        totalWatchTimeDays: Math.round(totalWatchTimeMinutes / (60 * 24) * 10) / 10
      },
      mostWatchedChannels,
      monthlyStats,
      yearlyStats,
      topFavorites,
      ratingDistribution, // <-- CRITICAL: Include this in return
      ratingValues, // <-- Also include raw values for other calculations
      watchingHabits: calculateWatchingHabits(videos)
    };
  }

  function estimateWatchTime(video) {
    // Estimate based on video type and duration if available
    if (video.duration) {
      const match = video.duration.match(/(\d+):(\d+)/);
      if (match) {
        return parseInt(match) * 60 + parseInt(match); // Fixed: was match twice
      }
    }

    // Default estimates by type
    if (video.isMusic || isMusicVideo(video)) return 4; // 4 minutes
    return 8; // 8 minutes for regular videos
  }

  function calculateMonthlyStats(videos) {
    const monthlyData = {};
    videos.filter(v => v.watchedAt).forEach(video => {
      const date = new Date(video.watchedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          count: 0,
          watchTime: 0,
          month: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
        };
      }
      monthlyData[monthKey].count++;
      monthlyData[monthKey].watchTime += estimateWatchTime(video);
    });

    return Object.values(monthlyData)
      .sort((a, b) => new Date(a.month + ' 01') - new Date(b.month + ' 01'))
      .slice(-12)
      .map(data => ({
        ...data,
        watchTimeHours: Math.round(data.watchTime / 60 * 10) / 10
      }));
  }

  function calculateYearlyStats(videos) {
    const yearlyData = {};
    videos.filter(v => v.watchedAt).forEach(video => {
      const year = new Date(video.watchedAt).getFullYear();
      if (!yearlyData[year]) {
        yearlyData[year] = { count: 0, watchTime: 0 };
      }
      yearlyData[year].count++;
      yearlyData[year].watchTime += estimateWatchTime(video);
    });

    return Object.entries(yearlyData)
      .sort(([a], [b]) => parseInt(b) - parseInt(a))
      .slice(0, 5)
      .map(([year, data]) => ({
        year: parseInt(year),
        count: data.count,
        watchTimeHours: Math.round(data.watchTime / 60),
        watchTimeDays: Math.round(data.watchTime / (60 * 24) * 10) / 10
      }));
  }

  function isMusicVideo(video) {
    const text = `${video.title || ''} ${video.channel || ''}`.toLowerCase();
    return /music|song|album|artist|official music video|vevo|records/i.test(text);
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

    const peakHour = Object.entries(hourCounts).sort(([,a], [,b]) => b - a);
    const peakDay = Object.entries(dayOfWeekCounts).sort(([,a], [,b]) => b - a);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      peakHour: peakHour ? `${peakHour}:00` : null,
      peakDay: peakDay ? dayNames[peakDay] : null,
      totalDaysActive: new Set(watchedVideos.map(v => new Date(v.watchedAt).toDateString())).size,
      busiestMonth: calculateBusiestMonth(watchedVideos)
    };
  }

  function calculateBusiestMonth(videos) {
    const monthCounts = {};
    videos.forEach(video => {
      const month = new Date(video.watchedAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    });

    const result = Object.entries(monthCounts).sort(([,a], [,b]) => b - a);
    return result ? result : null;
  }

  // Early returns for loading/auth states
  if (!session) {
    return (
      <div className="stats-container">
        <div className="auth-required-content">
          <div className="auth-icon">📊</div>
          <h3>Sign In Required</h3>
          <p>Sign in to see detailed analytics about your YouTube viewing habits.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="stats-container">
        <div className="loading-state">
          <p>Loading your statistics...</p>
        </div>
      </div>
    );
  }

  if (!stats || videos.length === 0) {
    return (
      <div className="stats-container">
        <div className="no-data-state">
          <div className="empty-icon">📊</div>
          <h3>No Data Available</h3>
          <p>Import your YouTube watch history to see detailed statistics!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-container">
      <div className="section-header">
        <h2>📊 Your Statistics</h2>
        <p>Comprehensive insights into your YouTube viewing habits and preferences</p>
      </div>

      {/* Overview Cards */}
      <div className="stats-overview">
        <div className="stat-card">
          <span className="stat-number">{stats.overview.totalVideos}</span>
          <span className="stat-label">Total Videos</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{totalRatings}</span>
          <span className="stat-label">Rated Videos</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{averageRating}</span>
          <span className="stat-label">Average Rating</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.overview.totalWatchTimeHours}</span>
          <span className="stat-label">Hours Watched</span>
        </div>
      </div>

      {/* Rating Distribution - SAFELY RENDERED */}
      {totalRatings > 0 && Object.keys(ratingDistribution).length > 0 && (
        <div className="stats-section">
          <h3>📊 Rating Distribution</h3>
          <div className="rating-distribution-container">
            <div className="average-score-display">
              <span className="average-number">{averageRating}</span>
              <span className="average-label">/10 Average Score</span>
            </div>
            
            <div className="distribution-chart">
              {Object.entries(ratingDistribution)
                .reverse()
                .map(([rating, count]) => {
                  const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
                  return (
                    <div key={rating} className="distribution-bar-fixed">
                      <span className="rating-label-fixed">{rating}★</span>
                      <div className="bar-container-fixed">
                        <div 
                          className="bar-fill-fixed" 
                          style={{ width: `${Math.max(percentage, count > 0 ? 5 : 0)}%` }}
                        ></div>
                      </div>
                      <span className="rating-count-fixed">{count}</span>
                      <span className="rating-percentage-fixed">{percentage.toFixed(1)}%</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Top Favorites */}
      {stats.topFavorites && stats.topFavorites.length > 0 && (
        <div className="stats-section">
          <h3>⭐ Your Top Rated Videos</h3>
          <div className="favorites-grid">
            {stats.topFavorites.map((video, index) => (
              <div key={video.id} className="favorite-item">
                <span className="favorite-rank">#{index + 1}</span>
                <div className="favorite-content">
                  <img src={video.thumbnail} alt={video.title} className="favorite-thumbnail" />
                  <div className="favorite-details">
                    <h4 className="favorite-title">{video.title}</h4>
                    <p className="favorite-channel">{video.channel}</p>
                    <span className="favorite-rating">{video.rating}/10 ⭐</span>
                  </div>
                </div>
                <a 
                  href={`https://www.youtube.com/watch?v=${video.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--sm btn--outline"
                >
                  Watch
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Most Watched Channels */}
      {stats.mostWatchedChannels && stats.mostWatchedChannels.length > 0 && (
        <div className="stats-section">
          <h3>📺 Most Watched Channels</h3>
          <div className="channel-stats-grid">
            {stats.mostWatchedChannels.slice(0, 5).map((channel, index) => (
              <div key={channel.name} className="channel-stat-item">
                <span className="rank">#{index + 1}</span>
                <div className="channel-details">
                  <h4>{channel.name}</h4>
                  <div className="channel-metrics">
                    <span>{channel.watchCount} videos</span>
                    <span>{channel.totalWatchTime}h watched</span>
                    {channel.averageRating && (
                      <span>Avg: {channel.averageRating}/10</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
