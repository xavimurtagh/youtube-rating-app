import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { socialAPI } from '../../utils/api';
import VideoList from '../../components/VideoList';

export default function ProfilePage() {
  const router = useRouter();
  const { id: rawId } = router.query;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

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

  if (loading) {
    return <div>Loading profile…</div>;
  }
  if (error) {
    return <div>{error}</div>;
  }
  if (!profile) {
    return null;  // Avoid accessing profile.ratings when null
  }

  // Only now is profile non-null
  const favs = profile.favourites || [];
  const rated = profile.ratings || [];

  return (
    <div className="profile-page">
      <h2>{profile.name}’s Profile</h2>
      {profile.avatar && (
        <img
          src={profile.avatar}
          alt={profile.name}
          className="profile-avatar"
        />
      )}
      {profile.bio && <p className="profile-bio">{profile.bio}</p>}

      <h3>⭐ Top 5 Favorites</h3>
      {favs.length > 0 ? (
        <VideoList videos={favs} ratings={{}} showLimit={5} />
      ) : (
        <p>No favorites yet.</p>
      )}

      <h3>📊 Ratings</h3>
      {rated.length > 0 ? (
        <ul>
          {rated.map((r) => (
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
