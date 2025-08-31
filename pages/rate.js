import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import RatingModal from '../components/RatingModal';

export default function QuickRate() {
  const router = useRouter();
  const { data: session } = useSession();
  const [video, setVideo] = useState(null);
  const { videoId, title, channel } = router.query;

  useEffect(() => {
    if (videoId && title) {
      setVideo({
        id: videoId,
        title: decodeURIComponent(title),
        channel: decodeURIComponent(channel || 'Unknown Channel'),
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      });
    }
  }, [videoId, title, channel]);

  const handleRate = async (videoData, rating) => {
    try {
      const response = await fetch('/api/rate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video: videoData, score: rating }),
      });
      
      if (response.ok) {
        alert('Rating saved successfully!');
        window.close();
      } else {
        throw new Error('Failed to save rating');
      }
    } catch (error) {
      console.error('Failed to save rating:', error);
      alert('Failed to save rating. Please try again.');
    }
  };

  if (!session) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Sign In Required</h2>
        <p>Please sign in to your account first, then try again.</p>
        <button onClick={() => window.close()}>Close Window</button>
      </div>
    );
  }

  if (!video) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Invalid Video</h2>
        <p>No video information provided.</p>
        <button onClick={() => window.close()}>Close Window</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <RatingModal
        video={video}
        onRate={handleRate}
        onClose={() => window.close()}
        isOpen={true}
      />
    </div>
  );
}
