import VideoCard from './VideoCard';

export default function VideoList({ videos, ratings, onRateVideo, showLimit = 20 }) {
  if (!videos || videos.length === 0) {
    return (
      <div className="empty-state">
        <p>Start rating videos to see your history here</p>
      </div>
    );
  }

  const displayVideos = showLimit ? videos.slice(0, showLimit) : videos;
  const hasMore = showLimit && videos.length > showLimit;

  return (
    <div>
      {hasMore && (
        <p className="mb-16">Showing first {showLimit} videos...</p>
      )}
      <div className="videos-grid">
        {displayVideos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            rating={ratings[video.id]?.rating}
            onRate={onRateVideo}
          />
        ))}
      </div>
      {hasMore && (
        <p className="mb-16">
          {videos.length - showLimit} more videos available
        </p>
      )}
    </div>
  );
}
