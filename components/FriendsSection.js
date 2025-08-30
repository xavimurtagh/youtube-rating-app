import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { socialAPI } from '../utils/api';
import { useRouter } from 'next/router';

export default function FriendsSection() {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(true);

  // Load following list on mount
  useEffect(() => {
    if (session) {
      loadFollowing();
    }
  }, [session]);

  const router = useRouter();
  const handleViewProfile = (userId) => {
    router.push(`/profile/${userId}`);
  };

  const loadFollowing = async () => {
    try {
      const followingData = await socialAPI.getFollowing();
      setFollowing(followingData);
    } catch (error) {
      console.error('Failed to load following:', error);
    } finally {
      setLoadingFollowing(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      const results = await socialAPI.searchUsers(searchTerm);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId) => {
    try {
      await socialAPI.followUser(userId);
      setSearchResults(prev => 
        prev.map(user => 
          user.id === userId ? { ...user, isFollowing: true } : user
        )
      );
      // Refresh following list
      loadFollowing();
    } catch (error) {
      console.error('Follow failed:', error);
      alert('Follow failed: ' + error.message);
    }
  };

  const handleUnfollow = async (userId) => {
    try {
      await socialAPI.unfollowUser(userId);
      setFollowing(prev => prev.filter(user => user.id !== userId));
      setSearchResults(prev => 
        prev.map(user => 
          user.id === userId ? { ...user, isFollowing: false } : user
        )
      );
    } catch (error) {
      console.error('Unfollow failed:', error);
      alert('Unfollow failed: ' + error.message);
    }
  };

  if (!session) {
    return (
      <div className="auth-required">
        <div className="auth-prompt">
          <h2>👥 Sign In to Find Friends</h2>
          <p>Use the Sign In button at the top to access social features!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="friends-section">
      <div className="friends-header">
        <h2>👥 Friends & Following</h2>
        <p className="section-description">
          Manage your social connections and discover new users
        </p>
      </div>

      {/* Following List */}
      <div className="following-section">
        <h3>👥 People You Follow ({following.length})</h3>
        {loadingFollowing ? (
          <div className="loading-state">
            <p>Loading your connections...</p>
          </div>
        ) : following.length > 0 ? (
          <div className="users-grid">
            {following.map(user => (
              <div key={user.id} className="user-card-fixed">
                <img 
                  src={user.avatar || '/default-avatar.png'} 
                  alt={user.name}
                  className="user-avatar" 
                />
                <div className="user-info-flex">
                  <h4 className="user-name">{user.name}</h4>
                  <p className="user-email">{user.email}</p>
                  <p className="user-stats">{user.totalRatings} ratings</p>
                </div>
                <div className="user-actions">
                  <button 
                    className="btn btn--sm btn--outline"
                    onClick={() => handleViewProfile(user.id)}
                  >
                    👁️ Profile
                  </button>
                  <button 
                    className="btn btn--sm btn--danger"
                    onClick={() => handleUnfollow(user.id)}
                  >
                    ❌ Unfollow
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-following">
            <p>You're not following anyone yet. Search below to find users!</p>
          </div>
        )}
      </div>

      {/* Search Section */}
      <div className="search-section">
        <h3>🔍 Find New Friends</h3>
        <form onSubmit={handleSearch} className="search-bar">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-control search-input"
            disabled={loading}
          />
          <button 
            type="submit" 
            className="btn btn--primary" 
            disabled={loading || !searchTerm.trim()}
          >
            {loading ? 'Searching...' : '🔍 Search Users'}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="search-results">
            <h4>Search Results ({searchResults.length})</h4>
            <div className="users-grid">
              {searchResults.map(user => (
                <div key={user.id} className="user-card">
                  <img 
                    src={user.avatar || '/default-avatar.png'} 
                    alt={user.name}
                    className="user-avatar" 
                  />
                  <div className="user-info">
                    <h4 className="user-name">{user.name}</h4>
                    <p className="user-email">{user.email}</p>
                    <p className="user-stats">{user.totalRatings} ratings</p>
                  </div>
                  <button 
                    className={`btn btn--sm ${user.isFollowing ? 'btn--outline' : 'btn--primary'}`}
                    onClick={() => user.isFollowing ? handleUnfollow(user.id) : handleFollow(user.id)}
                  >
                    {user.isFollowing ? '✓ Following' : 'Follow'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {searchTerm && searchResults.length === 0 && !loading && (
          <div className="no-results">
            <p>No users found for "{searchTerm}". Try searching by name or email.</p>
          </div>
        )}
      </div>
    </div>
  );
}
