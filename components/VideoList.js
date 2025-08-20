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
      </div>
    );
  }

  // If showLimit is null/undefined/0, show all
  const displayVideos =
    !showLimit || showLimit >= videos.length
      ? videos
      : videos.slice(0, showLimit);

  return (
    <div className="videos-grid">
      {displayVideos.map(video => (
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
      {showLimit &&
        videos.length > showLimit && (
          <div className="more-videos-info">
            {videos.length - showLimit} more videos available
          </div>
        )}
    </div>
  );
}
