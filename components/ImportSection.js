import { useState } from 'react';
import FileUpload from './FileUpload';
import VideoList from './VideoList';

export default function ImportSection({ videos, ratings, ignoredIds = [], onImportComplete, onRateVideo, onIgnoreVideo, clearUnrated }) {
  const [importStatus, setImportStatus] = useState(null);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [sortOrder, setSortOrder] = useState('newest');
  const [clearing, setClearing] = useState(false);
  const VIDEOS_PER_PAGE = 20;

  const handleFileParsed = (result) => {
    if (result && result.videos) {
      const message = `Successfully imported ${result.videos.length} videos`;
      setImportStatus(message);
      setError(null);
      onImportComplete(result.videos);
    } else {
      setError('Failed to parse video data from file');
    }
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    setImportStatus(null);
  };

  const handleIgnore = (videoId) => {
    if (onIgnoreVideo) {
      onIgnoreVideo(videoId);
    }
  };

  const handleClearAllUnrated = async () => {
    if (clearing) return;
  
    const videosToIgnore = videosToRate.map(v => v.id);
    
    if (!confirm(`Are you sure you want to ignore all ${videosToIgnore.length} unrated videos?`)) {
      return;
    }
  
    setClearing(true);
    
    try {
      for (const videoId of videosToIgnore) {
        await onIgnoreVideo(videoId);
      }
            
      // Reload after all are processed
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Failed to clear all unrated:', error);
      alert('Failed to clear all videos. Please try again.');
      setClearing(false);
    }
  };


  // Get videos that need rating (not rated and not ignored)
  const importedVideos = videos.filter(video => video.watchedAt);
  let videosToRate = importedVideos.filter(video => 
    !ratings[video.id] && 
    !video.ignored && 
    !ignoredIds.includes(video.id)
  );
  
  videosToRate = videosToRate.sort((a,b) => {
    const ta = new Date(a.watchedAt).getTime();
    const tb = new Date(b.watchedAt).getTime();
    return sortOrder==='newest' ? tb - ta : ta - tb;
  });

  const ratedVideos = importedVideos.filter(video => ratings[video.id]);
  const ignoredVideos = importedVideos.filter(video => video.ignored || ignoredIds.includes(video.id));

  const totalPages = Math.ceil(videosToRate.length / VIDEOS_PER_PAGE);
  const currentVideos = videosToRate.slice(
    currentPage * VIDEOS_PER_PAGE,
    (currentPage + 1) * VIDEOS_PER_PAGE
  );

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="import-section">
      <div className="section-header">
        <h2>📁 Import YouTube Watch History</h2>
        <p className="section-description">
          Import your YouTube watch history from Google Takeout and rate or ignore videos to keep your list organized.
        </p>
      </div>

      <FileUpload 
        onFileParsed={handleFileParsed}
        onError={handleError}
      />

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {importStatus && (
        <div className="success-message">
          {importStatus}
        </div>
      )}

      {importedVideos.length > 1000 && (
        <div className="warning-message">
          <strong>Large file detected:</strong> Your watch history has been truncated to the most recent videos.
        </div>
      )}

      {videosToRate.length > 0 ? (
        <div className="videos-to-rate">
          <div className="section-stats">
            <p>Rate these videos or ignore them to remove them from this list. Music videos will appear in the Music tab after rating.</p>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-number">{videosToRate.length}</span>
                <span className="stat-label">To Rate</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{ratedVideos.length}</span>
                <span className="stat-label">Rated</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{ignoredVideos.length}</span>
                <span className="stat-label">Ignored</span>
              </div>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="sort-controls">
            <label>
              Sort by:
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </label>
          </div>

          {/* Clear All Button */}
          <div className="bulk-actions">
            <button 
              onClick={clearUnrated}
              className="btn btn--outline btn--warning"
              disabled={clearing}
              title="Ignore all unrated videos and remove them from this list"
            >
              {clearing ? '🔄 Clearing...' : `🗑️ Clear All Unrated (${videosToRate.length})`}
            </button>
          </div>

          <VideoList
            videos={currentVideos}
            ratings={ratings}
            onRateVideo={onRateVideo}
            onIgnoreVideo={handleIgnore}
            showIgnoreButton={true}
            ignoreButtonText="Ignore"
            showLimit={null}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                className="btn btn--outline"
              >
                Previous
              </button>
              <span className="page-info">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button 
                onClick={handleNextPage}
                disabled={currentPage === totalPages - 1}
                className="btn btn--outline"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : importedVideos.length > 0 ? (
        <div className="all-rated">
          <h3>🎉 You've rated or ignored all your imported videos. Great job organizing your watch history!</h3>
          <div className="completion-stats">
            <p><strong>What's next?</strong></p>
            <ul>
              <li>Check out your ratings in the "My Ratings" tab</li>
              <li>Discover music videos in the "Music & Songs" tab</li>
              <li>View your statistics in the "Statistics" tab</li>
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
