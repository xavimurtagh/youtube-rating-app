import { escapeHtml } from '../utils/googleTakeout';

export default function VideoCard({ video, rating, onRate, requireAuth = false }) {
  const handleRate = () => {
    if (onRate) {
      onRate(video);
    }
  };

  return (
    <div className="video-card">
      {video.thumbnail && (
        <div className="video-thumbnail-container">
          <img 
            src={video.thumbnail} 
            alt={video.title}
            className="video-thumbnail"
          />
          {video.duration && (
            <span className="video-duration">{video.duration}</span>
          )}
        </div>
      )}

      <div className="video-info">
        <h3 className="video-title" dangerouslySetInnerHTML={{ __html: escapeHtml(video.title) }} />
        <p className="video-channel" dangerouslySetInnerHTML={{ __html: escapeHtml(video.channel) }} />

        {video.watchedAt && (
          <p className="watch-date">
            Watched: {new Date(video.watchedAt).toLocaleDateString()}
          </p>
        )}

        <div className="video-stats">
          <span>{video.viewCount ? `${parseInt(video.viewCount).toLocaleString()} views` : ''}</span>
          {video.publishedAt && (
            <span>{new Date(video.publishedAt).toLocaleDateString()}</span>
          )}
        </div>

        <div className="video-actions">
          {rating ? (
            <div className="current-rating">
              <span className="rating-number">{rating}</span>
              <span className="rating-label">/10</span>
              <button 
                onClick={handleRate}
                className="btn btn--outline btn--sm"
                style={{ marginLeft: '8px' }}
              >
                Edit Rating
              </button>
            </div>
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
