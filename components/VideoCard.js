import { escapeHtml } from '../utils/googleTakeout';

export default function VideoCard({ video, rating, onRate }) {
  const handleRate = () => {
    if (onRate) {
      onRate(video);
    }
  };

  return (
    <div className="video-card">
      <div className="video-info">
        <h3 className="video-title" dangerouslySetInnerHTML={{ __html: escapeHtml(video.title) }} />
        <p className="video-channel" dangerouslySetInnerHTML={{ __html: escapeHtml(video.channel) }} />
        {video.watchedAt && (
          <p className="video-date">
            Watched: {new Date(video.watchedAt).toLocaleDateString()}
          </p>
        )}

        <div className="video-actions">
          {rating ? (
            <span className="current-rating">
              Rating: {rating}/10
            </span>
          ) : (
            <button onClick={handleRate} className="btn btn--primary btn--sm">
              Rate Video
            </button>
          )}

          {video.url && (
            <a 
              href={video.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn--outline btn--sm"
            >
              Watch on YouTube
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
