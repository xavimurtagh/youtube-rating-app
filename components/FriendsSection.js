// components/FriendsSection.js
import { useState } from 'react';

export default function FriendsSection() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    // Implement user search API call
    const results = await searchUsers(searchTerm);
    setSearchResults(results);
  };

  return (
    <div className="friends-section">
      <h2>👥 Find Friends</h2>
      
      <form onSubmit={handleSearch} className="friend-search">
        <input
          type="text"
          placeholder="Search for users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-control"
        />
        <button type="submit" className="btn btn--primary">Search</button>
      </form>
      
      <div className="friend-results">
        {searchResults.map(user => (
          <div key={user.id} className="friend-card">
            <img src={user.avatar} alt={user.name} className="friend-avatar" />
            <div className="friend-info">
              <h4>{user.name}</h4>
              <p>{user.totalRatings} ratings</p>
            </div>
            <button 
              className="btn btn--outline"
              onClick={() => followUser(user.id)}
            >
              Follow
            </button>
          </div>
        ))}
      </div>
      
      <div className="friends-list">
        <h3>Your Friends</h3>
        {friends.map(friend => (
          <div key={friend.id} className="friend-item">
            <img src={friend.avatar} alt={friend.name} />
            <span>{friend.name}</span>
            <span className="friend-activity">
              Rated {friend.recentRatings} videos this week
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
