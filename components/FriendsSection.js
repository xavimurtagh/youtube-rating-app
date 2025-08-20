import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { socialAPI } from '../utils/api';

export default function FriendsSection() {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      // You'll need to create this API endpoint
      const results = await socialAPI.searchUsers(searchTerm);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId) => {
    try {
      await socialAPI.followUser(userId);
      // Update UI optimistically
      setSearchResults(prev => 
        prev.map(user => 
          user.id === userId ? { ...user, isFollowing: true } : user
        )
      );
    } catch (error) {
      console.error('Follow failed:', error);
    }
  };

  if (!session) {
    return (
      <div className="auth-required">
        <div className="auth-prompt">
          <h2>👥 Sign In to Find Friends</h2>
          <p>Sign in to search for friends and see their video ratings!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="friends-section">
      <div className="friends-header">
        <h2>👥 Find & Follow Friends</h2>
        <p className="section-description">
          Connect with other users to see their ratings and get recommendations
        </p>
      </div>

      <div className="friend-search">
        <form onSubmit={handleSearch} className="search-bar">
          <input
            type="text"
            placeholder="Search for users by name or email..."
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
      </div>

      {searchResults.length > 0 && (
        <div className="search-results">
          <h3>Search Results</h3>
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
                  <p className="user-stats">{user.totalRatings || 0} ratings</p>
                </div>
                <button 
                  className={`btn btn--sm ${user.isFollowing ? 'btn--outline' : 'btn--primary'}`}
                  onClick={() => handleFollow(user.id)}
                  disabled={user.isFollowing}
                >
                  {user.isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="friends-placeholder">
        <div className="placeholder-content">
          <div className="friends-icon">👥</div>
          <h3>Start Building Your Network</h3>
          <p>Search for friends above to start following other users and see their ratings!</p>
        </div>
      </div>
    </div>
  );
}
