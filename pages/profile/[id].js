import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { socialAPI } from '../../utils/api'
import VideoList from '../../components/VideoList'

export default function ProfilePage() {
  const router = useRouter()
  const { id: rawId } = router.query
  const id = Array.isArray(rawId) ? rawId[0] : rawId

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
    router.back() // Go back to previous page
  }

  if (loading) {
    return (
      <div className="profile-page-container">
        <div className="profile-page-content">
          <div>Loading profile…</div>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="profile-page-container">
        <div className="profile-page-content">
          <button onClick={handleGoBack} className="btn btn--outline back-button">
            ← Back
          </button>
          <div className="error-message">{error}</div>
        </div>
      </div>
    )
  }
  
  if (!profile) {
    return null
  }

  // Only now is profile non-null
  const favs = profile.favourites || []
  const rated = profile.ratings || []

  return (
    <div className="profile-page-container">
      <div className="profile-page-content">
        <button onClick={handleGoBack} className="btn btn--outline back-button">
          ← Back to Friends
        </button>
        
        <div className="profile-header">
          <h2>{profile.name}'s Profile</h2>
          {profile.avatar && (
            <img
              src={profile.avatar}
              alt={profile.name}
              className="profile-avatar"
            />
          )}
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
        </div>

        <div className="profile-sections">
          <div className="profile-section">
            <h3>⭐ Top 5 Favorites</h3>
            {favs.length > 0 ? (
              <VideoList videos={favs} ratings={{}} showLimit={5} />
            ) : (
              <p className="empty-message">No favorites yet.</p>
            )}
          </div>

          <div className="profile-section">
            <h3>📊 Ratings ({rated.length})</h3>
            {rated.length > 0 ? (
              <div className="ratings-list">
                {rated.slice(0, 10).map((r) => (
                  <div key={r.videoId} className="rating-item">
                    <span className="rating-score">{r.score}/10</span>
                    <span className="rating-video">Video {r.videoId}</span>
                  </div>
                ))}
                {rated.length > 10 && (
                  <p className="more-ratings">...and {rated.length - 10} more ratings</p>
                )}
              </div>
            ) : (
              <p className="empty-message">No ratings yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
