import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { socialAPI } from '../../utils/api'

export default function ProfilePage() {
  const router = useRouter()
  const { id: rawId } = router.query
  const id = Array.isArray(rawId) ? rawId : rawId

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [ratingFilter, setRatingFilter] = useState('all')
  const [ratingsPage, setRatingsPage] = useState(1);
  const ratingsPerPage = 20;

  useEffect(() => {
    if (!id) return
    loadProfile()
  }, [id])

  const loadProfile = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await socialAPI.getProfile(id)
      setProfile(data)
    } catch (err) {
      console.error(err)
      setError('Failed to load profile.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoBack = () => {
    router.back()
  }

  if (loading) {
    return (
      <div className="profile-page-container">
        <div className="loading-state">
          <p>Loading profile…</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="profile-page-container">
        <div className="profile-page-content">
          <p className="error-message">{error}</p>
        </div>
      </div>
    )
  }
  
  if (!profile) {
    return null
  }

  const favs = profile.favourites || []
  const rated = profile.ratings || []
  
  // Filter ratings based on selected filter
  const filteredRatings = ratingFilter === 'all' 
    ? rated 
    : rated.filter(r => {
        switch (ratingFilter) {
          case '9-10': return r.score >= 9 && r.score <= 10;
          case '7-8': return r.score >= 7 && r.score <= 8;
          case '5-6': return r.score >= 5 && r.score <= 6;
          case '3-4': return r.score >= 3 && r.score <= 4;
          case '1-2': return r.score >= 1 && r.score <= 2;
          default: return true;
        }
      });

  // Calculate user stats
  const totalRatings = rated.length;
  const averageRating = totalRatings > 0 
    ? (rated.reduce((sum, r) => sum + r.score, 0) / totalRatings).toFixed(1)
    : 0;

  // Calculate rating distribution
  const ratingDistribution = {};
  for (let i = 1; i <= 10; i++) {
    ratingDistribution[i] = rated.filter(r => Math.floor(r.score) === i).length;
  }

  const getVideoUrl = (videoId) => {
    return `https://www.youtube.com/watch?v=${videoId}`;
  };

  return (
    <div className="profile-page-container">
      <div className="profile-page-content">
        <button onClick={handleGoBack} className="btn btn--outline back-button">
          ← Back to Friends
        </button>
        
        <div className="profile-header">
          <h2>{profile.name}'s Profile</h2>
          {profile.avatar && (
            <img src={profile.avatar} alt={profile.name} className="profile-avatar" />
          )}
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
          
          {/* User Stats */}
          <div className="profile-stats">
            <div className="stat-item">
              <span className="stat-number">{totalRatings}</span>
              <span className="stat-label">Total Ratings</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{averageRating}</span>
              <span className="stat-label">Average Score</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{favs.length}</span>
              <span className="stat-label">Favorites</span>
            </div>
          </div>
        </div>

        <div className="profile-sections">
          {/* Favorites - Horizontal Layout */}
          <div className="profile-section">
            <h3>⭐ Favorites ({favs.length})</h3>
            {favs.length > 0 ? (
              <div className="favorites-profile-grid">
                {favs.map((video, index) => (
                  <div key={video.id} className="favorite-profile-card">
                    <div className="favorite-thumbnail-container">
                      <img src={video.thumbnail} alt={video.title} />
                      <div className="favorite-rank">#{index + 1}</div>
                    </div>
                    <div className="favorite-info">
                      <h4 className="favorite-title">{video.title}</h4>
                      <p className="favorite-channel">{video.channel}</p>
                      </div>
                      <a 
                        href={`https://www.youtube.com/watch?v=${video.id}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="watch-youtube-link"
                      >
                        🎬 Watch on YouTube
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-message">No favorites yet.</p>
            )}
          </div>

          {/* Rating Distribution */}
          {totalRatings > 0 && (
            <div className="profile-section">
              <h3>📊 Rating Distribution</h3>
              <div className="rating-distribution">
                <p><strong>Average Score: {averageRating}/10</strong></p>
                <div className="distribution-chart">
                  {Object.entries(ratingDistribution)
                    .reverse()
                    .map(([rating, count]) => (
                      <div key={rating} className="distribution-bar">
                        <span className="rating-label">{rating}★</span>
                        <div className="bar-container">
                          <div 
                            className="bar-fill" 
                            style={{width: `${totalRatings > 0 ? (count/totalRatings)*100 : 0}%`}}
                          ></div>
                        </div>
                        <span className="rating-count">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Ratings with Filter */}
          <div className="profile-section">
            <div className="section-header">
              <h3>📊 Ratings ({filteredRatings.length})</h3>
              <div className="filter-controls">
                <label>Filter by rating:</label>
                <select 
                  value={ratingFilter} 
                  onChange={(e) => {
                    setRatingFilter(e.target.value);
                    setRatingsPage(1); // Reset to page 1 when filtering
                  }}
                  className="form-control filter-select"
                >
                  <option value="all">All Ratings</option>
                  <option value="9-10">9-10 (Excellent)</option>
                  <option value="7-8">7-8 (Good)</option>
                  <option value="5-6">5-6 (Okay)</option>
                  <option value="3-4">3-4 (Poor)</option>
                  <option value="1-2">1-2 (Terrible)</option>
                </select>
              </div>
            </div>
            
            {filteredRatings.length > 0 ? (
              <>
                <div className="ratings-list">
                  {filteredRatings
                    .slice((ratingsPage - 1) * ratingsPerPage, ratingsPage * ratingsPerPage)
                    .map((r) => (
                      <div key={r.id} className="rating-item">
                        <span className="rating-score">{r.score}/10</span>
                        <div className="rating-video">
                          <strong>{r.videoTitle}</strong>
                          <br />
                          <span className="channel-name">{r.videoChannel}</span>
                        </div>
                        <a 
                          href={getVideoUrl(r.videoId)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="video-link"
                        >
                          🎬 Watch Video
                        </a>
                      </div>
                    ))}
                </div>
                
                {/* Pagination Controls */}
                {filteredRatings.length > ratingsPerPage && (
                  <div className="pagination-controls">
                    <button 
                      onClick={() => setRatingsPage(ratingsPage - 1)}
                      disabled={ratingsPage === 1}
                      className="btn btn--outline btn--sm"
                    >
                      ← Previous
                    </button>
                    <span className="pagination-info">
                      Page {ratingsPage} of {Math.ceil(filteredRatings.length / ratingsPerPage)}
                    </span>
                    <button 
                      onClick={() => setRatingsPage(ratingsPage + 1)}
                      disabled={ratingsPage >= Math.ceil(filteredRatings.length / ratingsPerPage)}
                      className="btn btn--outline btn--sm"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="empty-message">No ratings match the selected filter.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  </div> 
  )
}
