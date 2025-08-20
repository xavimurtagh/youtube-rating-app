import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { socialAPI } from '../../utils/api';
import VideoList from '../../components/VideoList';

export default function ProfilePage() {
  const router = useRouter();
  const { id } = router.query;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await socialAPI.getProfile(id);
      setProfile(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading profile…</p>;
  if (error) return <p>{error}</p>;
  if (!profile) return null;

  // Prepare top 5 favorites
  const favs = profile.favourites || [];
  return (
    <div className="profile-page">
      <h2>{profile.name}’s Profile</h2>
      {profile.avatar && <img src={profile.avatar} alt={profile.name} className="profile-avatar" />}
      {profile.bio && <p className="profile-bio">{profile.bio}</p>}
      
      <h3>⭐ Top 5 Favorites</h3>
      {favs.length > 0 ? (
        <VideoList
          videos={favs}
          ratings={{}}
          showLimit={5}
        />
      ) : (
        <p>No favorites yet.</p>
      )}
      
      <h3>📊 Ratings</h3>
      {profile.ratings.length > 0 ? (
        <ul>
          {profile.ratings.map(r => (
            <li key={r.videoId}>
              <a href={`/video/${r.videoId}`}>Video {r.videoId}</a>: {r.score}/10
            </li>
          ))}
        </ul>
      ) : (
        <p>No ratings yet.</p>
      )}
    </div>
  );
}
