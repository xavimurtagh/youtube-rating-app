import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { socialAPI } from '../utils/api';

export default function FriendsSection() {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

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
    } catch (error) {
      console.error('Follow failed:', error);
      alert('Follow failed: ' + error.message);
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
        <h2>👥 Find & Follow Friends</h2>
        <p className="section-description">
          Search by name or email to find other users
        </p>
      </div>

      <div className="friend-search">
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
      </div>

      {searchResults.length > 0 && (
        <div className="search-results">
          <h3>Search Results ({searchResults.length})</h3>
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
                  onClick={() => handleFollow(user.id)}
                  disabled={user.isFollowing}
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
  );
}
