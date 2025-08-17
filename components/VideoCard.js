import { escapeHtml } from '../utils/googleTakeout';

// Function to detect if a video is likely music
function isMusicVideo(video) {
  const title = (video.title || '').toLowerCase();
  const channel = (video.channel || '').toLowerCase();
  
  const musicKeywords = [
    'music', 'song', 'album', 'artist', 'band', 'official music video',
    'live performance', 'concert', 'acoustic', 'cover', 'remix',
    'soundtrack', 'single', 'vevo', 'records'
  ];
  
  return musicKeywords.some(keyword => 
    title.includes(keyword) || channel.includes(keyword)
  );
}

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
      onIgnore(video);
    }
  };

  const isMusic = video.isMusic || isMusicVideo(video);

  return (
    <div className={`video-card ${isMusic ? 'music-video' : ''}`}>
      {video.thumbnail && (
        <div className="video-thumbnail-container">
          <img 
            src={video.thumbnail} 
            alt={video.title}
            className="video-thumbnail"
          />
          {isMusic && (
            <span className="music-badge">🎵</span>
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
        
        <div className="video-actions">
          {rating ? (
            <div className="current-rating">
              <span className="rating-number">{rating}</span>
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
