import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import VideoList from './VideoList';

export default function RatingsSection({ videos, ratings, onRateVideo, onRemoveRating, stats }) {
  const { data: session } = useSession();
  const [filterType, setFilterType] = useState('rated');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [genreFilter, setGenreFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const [sortOrder, setSortOrder] = useState('desc');
  const [groupBy, setGroupBy] = useState('rating');

  // Helper to get rating value (handle both old and new format)
  const getRatingValue = (videoId) => {
    const rating = ratings[videoId];
    if (!rating) return null;
    return typeof rating === 'object' ? rating.rating : rating;
  };

  // Filter out music videos - only show regular videos in ratings
  const regularVideos = videos.filter(video => !video.isMusic && !isMusicVideo(video));

  function isMusicVideo(video) {
    const text = `${video.title || ''} ${video.channel || ''}`.toLowerCase();
    return /music|song|album|artist|official music video|vevo|records/i.test(text);
  }

  function getVideoGenre(video) {
    const title = (video.title || '').toLowerCase();
    const channel = (video.channel || '').toLowerCase();
    const description = (video.description || '').toLowerCase();
    const searchText = `${title} ${channel} ${description}`;

    const genres = {
      gaming: ['gaming', 'gameplay', 'game', 'playthrough', 'review', 'trailer'],
      education: ['tutorial', 'how to', 'learn', 'education', 'course', 'lesson'],
      entertainment: ['comedy', 'funny', 'entertainment', 'show', 'movie', 'tv'],
      tech: ['tech', 'technology', 'review', 'unboxing', 'smartphone', 'laptop'],
      sports: ['sports', 'football', 'basketball', 'soccer', 'tennis', 'olympics'],
      news: ['news', 'breaking', 'report', 'update', 'politics'],
      lifestyle: ['vlog', 'lifestyle', 'daily', 'routine', 'fashion', 'beauty'],
      science: ['science', 'physics', 'chemistry', 'biology', 'space', 'nasa']
    };

    for (const [genre, keywords] of Object.entries(genres)) {
      if (keywords.some(keyword => searchText.includes(keyword))) {
        return genre;
      }
    }
    return 'other';
  }

  const availableGenres = useMemo(() => {
    const genres = new Set(regularVideos.map(video => getVideoGenre(video)));
    return Array.from(genres).sort();
  }, [regularVideos]);

  const filteredVideos = useMemo(() => {
    let filtered = regularVideos;

    if (filterType==='rated') {
      filtered = filtered.filter(v=>getRatingValue(v.id)!==null);
    } else if (filterType==='all') {
      // nothing
    }
    
    // After, simply:
    filtered = filtered.filter(v=> getRatingValue(v.id) !== null);

    if (ratingFilter !== 'all') {
      filtered = filtered.filter(video => {
        const rating = getRatingValue(video.id);
        if (!rating) return false;

        switch (ratingFilter) {
          case '1-2': return rating >= 1 && rating <= 2;
          case '3-4': return rating >= 3 && rating <= 4;
          case '5-6': return rating >= 5 && rating <= 6;
          case '7-8': return rating >= 7 && rating <= 8;
          case '9-10': return rating >= 9 && rating <= 10;
          default: return true;
        }
      });
    }

    if (genreFilter !== 'all') {
      filtered = filtered.filter(video => getVideoGenre(video) === genreFilter);
    }

    return filtered;
  }, [regularVideos, ratings, filterType, ratingFilter, genreFilter]);

  const sortedVideos = useMemo(() => {
    const sorted = [...filteredVideos];

    sorted.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'rating':
          aValue = getRatingValue(a.id) || 0;
          bValue = getRatingValue(b.id) || 0;
          break;
        case 'date':
          aValue = new Date(ratings[a.id]?.ratedAt || a.watchedAt || 0);
          bValue = new Date(ratings[b.id]?.ratedAt || b.watchedAt || 0);
          break;
        case 'title':
          aValue = (a.title || '').toLowerCase();
          bValue = (b.title || '').toLowerCase();
          break;
        case 'channel':
          aValue = (a.channel || '').toLowerCase();
          bValue = (b.channel || '').toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredVideos, ratings, sortBy, sortOrder]);

  const groupedVideos = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Videos': sortedVideos };
    }

    const groups = {};

    if (groupBy === 'rating') {
      sortedVideos.forEach(video => {
        const rating = getRatingValue(video.id);
        if (rating) {
          const group = `${rating}/10 Stars`;
          if (!groups[group]) groups[group] = [];
          groups[group].push(video);
        } else {
          if (!groups['Unrated']) groups['Unrated'] = [];
          groups['Unrated'].push(video);
        }
      });
    } else if (groupBy === 'genre') {
      sortedVideos.forEach(video => {
        const genre = getVideoGenre(video);
        const genreName = genre.charAt(0).toUpperCase() + genre.slice(1);
        if (!groups[genreName]) groups[genreName] = [];
        groups[genreName].push(video);
      });
    }

    return groups;
  }, [sortedVideos, ratings, groupBy]);

  // Calculate accurate stats for regular videos only
  const regularVideoStats = useMemo(() => {
    const totalRegularVideos = regularVideos.length;
    const ratedRegularVideos = regularVideos.filter(video => getRatingValue(video.id) !== null);
    const ratedCount = ratedRegularVideos.length;

    const ratingValues = ratedRegularVideos.map(video => getRatingValue(video.id)).filter(r => r !== null);
    const averageRating = ratingValues.length > 0 
      ? Math.round((ratingValues.reduce((sum, r) => sum + Number(r), 0) / ratingValues.length) * 10) / 10 
      : 0;

    return {
      totalVideos: totalRegularVideos,
      ratedVideos: ratedCount,
      unratedVideos: totalRegularVideos - ratedCount,
      averageRating
    };
  }, [regularVideos, ratings]);

  if (!session) {
    return (
      <div className="auth-required">
        <div className="auth-prompt">
          <h2>⭐ Sign In to View Your Ratings</h2>
          <p>Sign in to rate videos and see your personalized rating statistics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ratings-section">
      <div className="ratings-header">
        <h2>⭐ My Video Ratings</h2>
        <p className="section-description">
          Manage and filter your video ratings (music videos are in the Music tab)
        </p>
      </div>

      {/* Stats Overview */}
      <div className="ratings-stats">
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-number">{regularVideoStats.totalVideos}</div>
            <div className="stat-label">Total Videos</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{regularVideoStats.ratedVideos}</div>
            <div className="stat-label">Rated</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{regularVideoStats.unratedVideos}</div>
            <div className="stat-label">To Rate</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{regularVideoStats.averageRating}</div>
            <div className="stat-label">Avg Rating</div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="ratings-controls">
        {/* Basic Filters */}
        <div className="filter-row">
          <div className="filter-group">
            <span className="filter-label">Show:</span>
            <button
              className={`btn btn--sm ${filterType === 'rated' ? 'btn--primary' : 'btn--outline'}`}
              onClick={() => setFilterType('rated')}
            >
              Rated ({regularVideoStats.ratedVideos})
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="filter-row">
          <div className="filter-group">
            <label>
              <span>Rating:</span>
              <select 
                value={ratingFilter} 
                onChange={(e) => setRatingFilter(e.target.value)}
                className="form-control filter-select"
              >
                <option value="all">All Ratings</option>
                <option value="9-10">9-10 (Excellent)</option>
                <option value="7-8">7-8 (Good)</option>
                <option value="5-6">5-6 (Okay)</option>
                <option value="3-4">3-4 (Poor)</option>
                <option value="1-2">1-2 (Terrible)</option>
              </select>
            </label>
          </div>

          <div className="filter-group">
            <label>
              <span>Genre:</span>
              <select 
                value={genreFilter} 
                onChange={(e) => setGenreFilter(e.target.value)}
                className="form-control filter-select"
              >
                <option value="all">All Genres</option>
                {availableGenres.map(genre => (
                  <option key={genre} value={genre}>
                    {genre.charAt(0).toUpperCase() + genre.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="filter-group">
            <label>
              <span>Sort by:</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="form-control filter-select"
              >
                <option value="rating">Rating</option>
                <option value="date">Date Rated</option>
                <option value="title">Title</option>
                <option value="channel">Channel</option>
              </select>
            </label>
          </div>

          <div className="filter-group">
            <label>
              <span>Order:</span>
              <select 
                value={sortOrder} 
                onChange={(e) => setSortOrder(e.target.value)}
                className="form-control filter-select"
              >
                <option value="desc">High to Low</option>
                <option value="asc">Low to High</option>
              </select>
            </label>
          </div>

          <div className="filter-group">
            <label>
              <span>Group by:</span>
              <select 
                value={groupBy} 
                onChange={(e) => setGroupBy(e.target.value)}
                className="form-control filter-select"
              >
                <option value="rating">Rating</option>
                <option value="genre">Genre</option>
                <option value="none">No Grouping</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="ratings-content">
        {Object.keys(groupedVideos).length > 0 ? (
          Object.entries(groupedVideos)
            .sort(([a], [b]) => {
              if (groupBy === 'rating' && a.includes('/10') && b.includes('/10')) {
                const aRating = parseInt(a.split('/')[0]);
                const bRating = parseInt(b.split('/'));
                return sortOrder === 'desc' ? bRating - aRating : aRating - bRating;
              }
              return a.localeCompare(b);
            })
            .map(([groupName, groupVideos]) => (
              <div key={groupName} className="video-group">
                <h3 className="group-header">{groupName} ({groupVideos.length} videos)</h3>
                <VideoList
                  videos={groupVideos}
                  ratings={ratings}
                  onRateVideo={onRateVideo}
                  onRemoveRating={onRemoveRating}  // Add this line
                  showIgnoreButton={false}
                />
              </div>
            ))
        ) : (
          <div className="video-group">
            <h3 className="group-header">No videos found</h3>
            <p>No videos match your current filters. Try adjusting your search criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
