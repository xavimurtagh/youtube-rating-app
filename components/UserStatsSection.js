import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function UserStatsSection({ videos, ratings }) {
  const { data: session } = useSession();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (videos.length > 0) {
      const calculatedStats = calculateEnhancedStats(videos, ratings);
      setStats(calculatedStats);
    }
  }, [videos, ratings]);

  // Helper to get rating value
  const getRatingValue = (videoId) => {
    const rating = ratings[videoId];
    if (!rating) return null;
    return typeof rating === 'object' ? rating.rating : rating;
  };

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

    // Rating distribution
    const ratingDistribution = {};
    ratingValues.forEach(rating => {
      ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
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
      ratingDistribution,
      watchingHabits: calculateWatchingHabits(videos)
    };
  }

  function estimateWatchTime(video) {
    // Estimate based on video type and duration if available
    if (video.duration) {
      // Parse duration like "PT4M13S" or "4:13"
      const match = video.duration.match(/(\d+):(\d+)/);
      if (match) {
        return parseInt(match[1]) * 60 + parseInt(match[1]);
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

    const peakHour = Object.entries(hourCounts).sort(([,a], [,b]) => b - a)[0];
    
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
      const month = new Date(video.watchedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    });
    
    return Object.entries(monthCounts)
      .sort(([,a], [,b]) => b - a)[0] || null;
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
        <p>Import your YouTube watch history to see detailed statistics!</p>
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

      {/* Enhanced Overview Stats */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-number">{stats.overview.totalVideos}</div>
          <div className="stat-label">Total Videos</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.overview.totalWatchTimeHours}h</div>
          <div className="stat-label">Watch Time</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.overview.totalWatchTimeDays}</div>
          <div className="stat-label">Days Watched</div>
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
          <div className="stat-number">{stats.overview.musicVideos}</div>
          <div className="stat-label">Music Videos</div>
        </div>
      </div>

      {/* Top 5 Favorites */}
      {stats.topFavorites.length > 0 && (
        <div className="stats-card">
          <h3>⭐ Your Top 5 Favorite Videos</h3>
          <div className="favorites-grid">
            {stats.topFavorites.map((video, index) => (
              <div key={video.id} className="favorite-item">
                /*<div className="favorite-rank">#{index + 1}</div>*/
                <div className="favorite-content">
                  {video.thumbnail && (
                    <img src={video.thumbnail} alt={video.title} className="favorite-thumbnail" />
                  )}
                  <div className="favorite-details">
                    <h4 className="favorite-title">{video.title}</h4>
                    <p className="favorite-channel">{video.channel}</p>
                    <div className="favorite-rating">{video.rating}/10 ⭐</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Most Watched Channels */}
      <div className="stats-card">
        <h3>📺 Most Watched Channels</h3>
        <div className="channel-stats-grid">
          {stats.mostWatchedChannels.slice(0, 8).map((channel, index) => (
            <div key={channel.name} className="channel-stat-item">
              <div className="rank">#{index + 1}</div>
              <div className="channel-info">
                <div className="channel-name">{channel.name}</div>
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

      {/* Monthly Watch Time */}
      {stats.monthlyStats.length > 0 && (
        <div className="stats-card">
          <h3>📅 Monthly Watch Time</h3>
          <div className="monthly-chart">
            {stats.monthlyStats.map(month => (
              <div key={month.month} className="month-bar">
                <div className="month-label">{month.month}</div>
                <div className="bar-container">
                  <div 
                    className="bar-fill" 
                    style={{ 
                      width: `${(month.watchTimeHours / Math.max(...stats.monthlyStats.map(m => m.watchTimeHours))) * 100}%` 
                    }}
                  ></div>
                </div>
                <div className="month-stats">
                  <span>{month.count} videos</span>
                  <span>{month.watchTimeHours}h</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Yearly Overview */}
      {stats.yearlyStats.length > 0 && (
        <div className="stats-card">
          <h3>🗓️ Yearly Overview</h3>
          <div className="yearly-grid">
            {stats.yearlyStats.map(year => (
              <div key={year.year} className="year-stat">
                <div className="year-label">{year.year}</div>
                <div className="year-metrics">
                  <div>{year.count} videos</div>
                  <div>{year.watchTimeHours}h watched</div>
                  <div>{year.watchTimeDays} days</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Watching Habits */}
      {stats.watchingHabits && (
        <div className="stats-card">
          <h3>⏰ Watching Habits</h3>
          <div className="habits-grid">
            <div className="habit-item">
              <div className="habit-label">Peak Hour</div>
              <div className="habit-value">{stats.watchingHabits.peakHour || 'N/A'}</div>
            </div>
            <div className="habit-item">
              <div className="habit-label">Peak Day</div>
              <div className="habit-value">{stats.watchingHabits.peakDay || 'N/A'}</div>
            </div>
            <div className="habit-item">
              <div className="habit-label">Active Days</div>
              <div className="habit-value">{stats.watchingHabits.totalDaysActive}</div>
            </div>
            <div className="habit-item">
              <div className="habit-label">Busiest Month</div>
              <div className="habit-value">{stats.watchingHabits.busiestMonth || 'N/A'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
