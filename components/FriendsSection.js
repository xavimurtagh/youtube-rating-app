import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import styles from '../styles/FriendsSection.module.css';

export default function FriendsSection() {
  const { data: session } = useSession();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState(null);

  useEffect(() => {
    if (session) {
      loadFriends();
    }
  }, [session]);

  const loadFriends = async () => {
    try {
      const response = await fetch('/api/following');
      if (response.ok) {
        const data = await response.json();
        setFriends(data);
      }
    } catch (error) {
      console.error('Failed to load friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (userId) => {
    if (!confirm('Are you sure you want to unfollow this user?')) return;
    
    try {
      const response = await fetch(`/api/follow/${userId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setFriends(friends.filter(friend => friend.id !== userId));
      }
    } catch (error) {
      console.error('Failed to unfollow user:', error);
    }
  };

  const handleViewProfile = (friend) => {
    setSelectedProfile(friend);
  };

  if (!session) {
    return (
      <div className={styles.signInPrompt}>
        <h2>👥 Sign In to Find Friends</h2>
        <p>Use the Sign In button at the top to access social features!</p>
      </div>
    );
  }

  if (loading) {
    return <div className={styles.loading}>Loading your friends...</div>;
  }

  return (
    <div className={styles.friendsSection}>
      <h2>👥 Your Friends</h2>
      
      {friends.length > 0 ? (
        <div className={styles.friendsList}>
          {friends.map(friend => (
            <div key={friend.id} className={styles.friendCard}>
              <div className={styles.friendInfo}>
                <div className={styles.friendAvatar}>
                  {friend.image ? (
                    <img src={friend.image} alt={friend.name} />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      {friend.name?.charAt(0) || '?'}
                    </div>
                  )}
                </div>
                
                <div className={styles.friendDetails}>
                  <h3 className={styles.friendName}>{friend.name || 'Unknown User'}</h3>
                  <p className={styles.friendEmail}>{friend.email}</p>
                  {friend.totalRatings && (
                    <p className={styles.friendStats}>
                      {friend.totalRatings} ratings • Joined {new Date(friend.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              
              <div className={styles.friendActions}>
                <button 
                  onClick={() => handleViewProfile(friend)}
                  className={styles.profileButton}
                >
                  View Profile
                </button>
                <button 
                  onClick={() => handleUnfollow(friend.id)}
                  className={styles.unfollowButton}
                >
                  Unfollow
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.noFriends}>
          <p>You haven't followed anyone yet. Search for users to connect with!</p>
        </div>
      )}

      {selectedProfile && (
        <ProfileModal 
          profile={selectedProfile} 
          onClose={() => setSelectedProfile(null)} 
        />
      )}
    </div>
  );
}

function ProfileModal({ profile, onClose }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, [profile.id]);

  const loadProfileData = async () => {
    try {
      const response = await fetch(`/api/profile/${profile.id}`);
      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{profile.name}'s Profile</h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>

        {loading ? (
          <div className={styles.modalLoading}>Loading profile...</div>
        ) : profileData ? (
          <div className={styles.profileContent}>
            <div className={styles.recentRatings}>
              <h3>Recent Ratings</h3>
              {profileData.recentRatings?.length > 0 ? (
                <div className={styles.ratingsGrid}>
                  {profileData.recentRatings.map(rating => (
                    <div key={rating.id} className={styles.ratingItem}>
                      <a 
                        href={`https://www.youtube.com/watch?v=${rating.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.videoLink}
                      >
                        {rating.videoTitle || `Video ${rating.videoId.substring(0, 8)}...`}
                      </a>
                      <div className={styles.ratingBadge}>⭐ {rating.rating}/10</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No recent ratings</p>
              )}
            </div>

            <div className={styles.favoritesSection}>
              <h3>Favorite Videos</h3>
              {profileData.favorites?.length > 0 ? (
                <div className={styles.favoritesRow}>
                  {profileData.favorites.slice(0, 5).map(favorite => (
                    <div key={favorite.id} className={styles.favoriteItem}>
                      <div className={styles.favoriteThumbnail}>
                        {favorite.thumbnail ? (
                          <img src={favorite.thumbnail} alt={favorite.title} />
                        ) : (
                          <div className={styles.thumbnailPlaceholder}>📺</div>
                        )}
                      </div>
                      <div className={styles.favoriteInfo}>
                        <a 
                          href={`https://www.youtube.com/watch?v=${favorite.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.favoriteTitle}
                        >
                          {favorite.title}
                        </a>
                        <div className={styles.favoriteRating}>⭐ {favorite.rating}/10</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No favorites yet</p>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.modalError}>Failed to load profile</div>
        )}
      </div>
    </div>
  );
}
