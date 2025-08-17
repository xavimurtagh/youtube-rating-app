import { decodeHtmlEntities } from '../utils/htmlUtils';

export default function VideoCard({ 
  video, 
  rating, 
  onRate, 
  onIgnore, 
  showIgnoreButton = false,
  ignoreButtonText = 'Ignore'
}) {
  const handleRate = () => {
    if (onRate) {
      onRate(video);
    }
  };

  const handleIgnore = () => {
    if (onIgnore) {
      onIgnore(video.id);
    }
  };

  // Detect if video is music
  const isMusic = video.isMusic || isMusicVideo(video);

  function isMusicVideo(v) {
    const text = `${v.title || ''} ${v.channel || ''}`.toLowerCase();
    return /music|song|album|artist|official music video|vevo|records/i.test(text);
  }

  // Get rating value - handle both old format (number) and new format (object)
  const getRatingValue = () => {
    if (!rating) return null;
    return typeof rating === 'object' ? rating.rating : rating;
  };

  const ratingValue = getRatingValue();

  return (
    <div className={`video-card ${isMusic ? 'music-video' : ''}`}>
      {video.thumbnail && (
        <div className="video-thumbnail-container">
          <img 
            src={video.thumbnail} 
            alt={decodeHtmlEntities(video.title)}
            className="video-thumbnail"
          />
          {video.duration && (
            <span className="video-duration">{video.duration}</span>
          )}
          {isMusic && (
            <span className="music-badge">🎵</span>
          )}
        </div>
      )}

      <div className="video-info">
        <h3 className="video-title">
          {decodeHtmlEntities(video.title)}
        </h3>
        <p className="video-channel">
          {decodeHtmlEntities(video.channel)}
        </p>

        {video.watchedAt && (
          <p className="watch-date">
            Watched: {new Date(video.watchedAt).toLocaleDateString()}
          </p>
        )}

        {video.description && (
          <p className="video-description">
            {decodeHtmlEntities(video.description).substring(0, 100)}...
          </p>
        )}

        <div className="video-stats">
          {video.viewCount && (
            <span>{parseInt(video.viewCount).toLocaleString()} views</span>
          )}
          {video.publishedAt && (
            <span>{new Date(video.publishedAt).toLocaleDateString()}</span>
          )}
        </div>

        <div className="video-actions">
          {ratingValue ? (
            <div className="current-rating">
              <span className="rating-number">{ratingValue}</span>
              <span className="rating-label">/10</span>
              <button 
                onClick={handleRate}
                className="btn btn--outline btn--sm"
              >
                Edit Rating
              </button>
            </div>
          ) : (
            <button onClick={handleRate} className="btn btn--primary btn--sm">
              Rate Video
            </button>
          )}

          {showIgnoreButton && (
            <button 
              onClick={handleIgnore} 
              className="btn btn--outline btn--sm ignore-btn"
              title={ignoreButtonText === 'Ignore' ? 'Hide this video from your list' : 'Show this video again'}
            >
              {ignoreButtonText}
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
