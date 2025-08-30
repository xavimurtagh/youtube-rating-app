// components/UserProfile.js
import { useState } from 'react';

export default function UserProfile({ user, isOwnProfile }) {
  const [favorites, setFavorites] = useState(user?.favorites || []);
  const ratingDistribution = calculateRatingDistribution(user.ratings);
  const averageScore = calculateAverageScore(user.ratings);
  
  return (
    <div className="user-profile">
      <div className="profile-header">
        <img src={user.avatar} alt={user.name} className="profile-avatar" />
        <div className="profile-info">
          <h1>{user.name}</h1>
          <p className="profile-bio">{user.bio}</p>
          <div className="profile-stats">
            <span>{user.totalRatings} ratings</span>
            <span>{user.followers} followers</span>
            <span>{user.following} following</span>
          </div>
        </div>
      </div>
      
      <div className="profile-sections">
        <div className="favorites-section">
          <h3>⭐ Top 5 Favorites</h3>
          <div className="favorites-horizontal">
            {favorites.slice(0, 5).map((video, index) => (
              <div key={video.id} className="favorite-letterboxd-style">
                <img src={video.thumbnail} alt={video.title} />
                <div className="favorite-overlay">
                  <span className="favorite-rank">#{index + 1}</span>
                  <span className="favorite-rating">{video.rating}/10</span>
                </div>
              </div>
            ))}
          </div>
          <div className="rating-distribution">
            <h3>Rating Distribution</h3>
            <div className="distribution-chart">
              {ratingDistribution.map(([rating, count]) => (
                <div key={rating} className="distribution-bar">
                  <span>{rating}★</span>
                  <div className="bar-fill" style={{width: `${(count/total)*100}%`}}></div>
                  <span>{count}</span>
                </div>
              ))}
            </div>
            <p>Average Score: {averageScore}/10</p>
          </div>
        </div>
      </div>
    </div>
  );
}
