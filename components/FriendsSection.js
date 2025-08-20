import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { socialAPI, authAPI } from '../utils/api';

export default function FriendsSection() {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      const results = await socialAPI.searchUsers(searchTerm);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed. Make sure you\'re logged in.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (authMode === 'login') {
        const result = await authAPI.login(authForm.email, authForm.password);
        localStorage.setItem('jwt', result.token);
        window.location.reload(); // Simple refresh to update session
      } else {
        const result = await authAPI.signup(authForm.email, authForm.password, authForm.name);
        localStorage.setItem('jwt', result.token);
        window.location.reload();
      }
    } catch (error) {
      alert('Authentication failed: ' + error.message);
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
      alert('Follow failed. Please try again.');
    }
  };

  // Simple auth form if not using NextAuth properly
  if (!session && !localStorage.getItem('jwt')) {
    return (
      <div className="auth-required">
        <div className="auth-form">
          <h2>👥 {authMode === 'login' ? 'Sign In' : 'Sign Up'} for Social Features</h2>
          <form onSubmit={handleAuth}>
            {authMode === 'signup' && (
              <input
                type="text"
                placeholder="Full Name"
                value={authForm.name}
                onChange={(e) => setAuthForm(prev => ({ ...prev, name: e.target.value }))}
                className="form-control"
                required
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={authForm.email}
              onChange={(e) => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
              className="form-control"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={authForm.password}
              onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
              className="form-control"
              required
            />
            <button type="submit" className="btn btn--primary">
              {authMode === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>
          <p>
            {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="btn btn--outline btn--sm"
            >
              {authMode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
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
