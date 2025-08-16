import VideoList from './VideoList';

export default function RatingsSection({ videos, ratings, onRateVideo, stats }) {
  const ratedVideos = videos.filter(video => ratings[video.id]);

  return (
    <div>
      <div className="ratings-header">
        <h2>Your Ratings</h2>
        <p className="section-description">
          View and manage your video ratings
        </p>

        <div className="rating-stats">
          <div className="stat">
            <span className="stat-number">{stats.totalVideos}</span>
            <span className="stat-label">Total Videos</span>
          </div>
          <div className="stat">
            <span className="stat-number">{stats.totalRatings}</span>
            <span className="stat-label">Rated</span>
          </div>
          <div className="stat">
            <span className="stat-number">{stats.averageRating}</span>
            <span className="stat-label">Avg Rating</span>
          </div>
        </div>
      </div>

      {ratedVideos.length > 0 ? (
        <VideoList
          videos={ratedVideos}
          ratings={ratings}
          onRateVideo={onRateVideo}
          showLimit={null}
        />
      ) : (
        <div className="empty-state">
          <h3>No ratings yet</h3>
          <p>Start rating videos from your imported history to see them here.</p>
        </div>
      )}
    </div>
  );
}
