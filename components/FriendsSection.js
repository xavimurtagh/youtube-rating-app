import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { socialAPI } from '../utils/api';
import { useRouter } from 'next/router';

export default function FriendsSection() {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(true);
  const [loadingFollowers, setLoadingFollowers] = useState(true);

  const router = useRouter();

  // Load following and followers on mount
  useEffect(() => {
    if (session) {
      loadFollowing();
      loadFollowers();
    }
  }, [session]);

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

  const loadFollowers = async () => {
    try {
      const followersData = await socialAPI.getFollowers();
      setFollowers(followersData);
    } catch (error) {
      console.error('Failed to load followers:', error);
    } finally {
      setLoadingFollowers(false);
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
      <div className="friends-section">
        <div className="auth-required-content">
          <div className="auth-icon">👥</div>
          <h3>Sign In to Find Friends</h3>
          <p>Use the Sign In button at the top to access social features!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="friends-section">
      <div className="section-header">
        <h2>👥 Friends & Following</h2>
        <p>Manage your social connections and discover new users</p>
      </div>

      {/* Following List - Fixed Layout */}
      <div className="following-section-fixed">
        <h3>👥 People You Follow ({following.length})</h3>
        {loadingFollowing ? (
          <div className="loading-state">
            <p>Loading your connections...</p>
          </div>
        ) : following.length > 0 ? (
          <div className="users-grid-fixed">
            {following.map(user => (
              <div key={user.id} className="user-card-fixed following-card">
                <div className="user-avatar-section">
                  <img src={user.avatar || '/default-avatar.png'} alt={user.name} className="user-avatar" />
                </div>
                <div className="user-info-section">
                  <h4 className="user-name">{user.name}</h4>
                  <p className="user-email">{user.email}</p>
                  <span className="user-stats">{user.totalRatings || 0} ratings</span>
                </div>
                <div className="user-actions-section">
                  <button 
                    onClick={() => handleViewProfile(user.id)}
                    className="btn btn--sm btn--outline"
                  >
                    Profile
                  </button>
                  <button 
                    onClick={() => handleUnfollow(user.id)}
                    className="btn btn--sm btn--danger"
                  >
                    Unfollow
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-message">
            <p>You're not following anyone yet. Search below to find users!</p>
          </div>
        )}
      </div>

      {/* Followers List - New Section */}
      <div className="followers-section-fixed">
        <h3>👥 Your Followers ({followers.length})</h3>
        {loadingFollowers ? (
          <div className="loading-state">
            <p>Loading your followers...</p>
          </div>
        ) : followers.length > 0 ? (
          <div className="users-grid-fixed">
            {followers.map(user => (
              <div key={user.id} className="user-card-fixed follower-card">
                <div className="user-avatar-section">
                  <img src={user.avatar || '/default-avatar.png'} alt={user.name} className="user-avatar" />
                </div>
                <div className="user-info-section">
                  <h4 className="user-name">{user.name}</h4>
                  <p className="user-email">{user.email}</p>
                  <span className="user-stats">{user.totalRatings || 0} ratings</span>
                </div>
                <div className="user-actions-section">
                  <button 
                    onClick={() => handleViewProfile(user.id)}
                    className="btn btn--sm btn--outline"
                  >
                    Profile
                  </button>
                  {!following.some(f => f.id === user.id) && (
                    <button 
                      onClick={() => handleFollow(user.id)}
                      className="btn btn--sm btn--primary"
                    >
                      Follow Back
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-message">
            <p>No followers yet. Share your profile to gain followers!</p>
          </div>
        )}
      </div>

      {/* Search Section with Fixed Message */}
      <div className="search-section-fixed">
        <h3>🔍 Find New Friends</h3>
        <form onSubmit={handleSearch} className="friend-search">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-control search-input"
            disabled={loading}
          />
          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? 'Searching...' : 'Search Users'}
          </button>
        </form>

        {/* Only show results after search is performed */}
        {searchResults.length > 0 && (
          <div className="search-results">
            <h4>Search Results ({searchResults.length})</h4>
            <div className="users-grid-fixed">
              {searchResults.map(user => (
                <div key={user.id} className="user-card-fixed search-result-card">
                  <div className="user-avatar-section">
                    <img src={user.avatar || '/default-avatar.png'} alt={user.name} className="user-avatar" />
                  </div>
                  <div className="user-info-section">
                    <h4 className="user-name">{user.name}</h4>
                    <p className="user-email">{user.email}</p>
                    <span className="user-stats">{user.totalRatings || 0} ratings</span>
                  </div>
                  <div className="user-actions-section">
                    <button 
                      onClick={() => handleViewProfile(user.id)}
                      className="btn btn--sm btn--outline"
                    >
                      Profile
                    </button>
                    <button 
                      onClick={() => handleFollow(user.id)}
                      className="btn btn--sm btn--primary"
                      disabled={user.isFollowing}
                    >
                      {user.isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Only show "no results" message after a search has been performed and returned empty */}
        {searchTerm && searchResults.length === 0 && !loading && searchTerm.length > 50 && (
          <div className="no-results-message">
            <p>No users found for "{searchTerm}". Try searching by name or email.</p>
          </div>
        )}
      </div>
    </div>
  );
}
