import VideoCard from './VideoCard';

export default function VideoList({
  videos,
  ratings,
  onRateVideo,
  onIgnoreVideo,
  showIgnoreButton = false,
  ignoreButtonText = 'Ignore',
  showLimit = 100
}) {
  if (!videos || videos.length === 0) {
    return (
      <div className="empty-state">
        <h3>Start rating videos to see your history here</h3>
        <p>Showing first {showLimit} videos...</p>
      </div>
    );
  }

  return (
    <div className="videos-grid">
      {videos.slice(0, showLimit).map(video => (
        <VideoCard
          key={video.id}
          video={video}
          rating={ratings[video.id]}
          onRate={onRateVideo}
          onIgnore={onIgnoreVideo}
          showIgnoreButton={showIgnoreButton}
          ignoreButtonText={ignoreButtonText}
        />
      ))}
      {videos.length > showLimit && (
        <div className="more-videos-info">
          {videos.length - showLimit} more videos available
        </div>
      )}
    </div>
  );
}
