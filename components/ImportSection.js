import { useState } from 'react';
import FileUpload from './FileUpload';
import VideoList from './VideoList';

export default function ImportSection({ videos, ratings, onImportComplete, onRateVideo, onIgnoreVideo }) {
  const [importStatus, setImportStatus] = useState(null);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [showIgnored, setShowIgnored] = useState(false);
  
  const VIDEOS_PER_PAGE = 20;

  const handleFileParsed = (result) => {
    const message = `Successfully imported ${result.videos.length} videos`;
    setImportStatus(message);
    setError(null);
    onImportComplete(result.videos);
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    setImportStatus(null);
  };

  // Filter videos: imported videos that haven't been rated or ignored
  const importedVideos = videos.filter(video => video.watchedAt);
  const unratedVideos = importedVideos.filter(video => 
    !ratings[video.id] && !video.ignored
  );
  const ratedVideos = importedVideos.filter(video => 
    ratings[video.id] && !video.ignored
  );
  const ignoredVideos = importedVideos.filter(video => video.ignored);
  
  const videosToShow = showIgnored ? ignoredVideos : unratedVideos;
  const totalPages = Math.ceil(videosToShow.length / VIDEOS_PER_PAGE);
  const currentVideos = videosToShow.slice(
    currentPage * VIDEOS_PER_PAGE,
    (currentPage + 1) * VIDEOS_PER_PAGE
  );

  const handleIgnore = (video) => {
    if (onIgnoreVideo) {
      onIgnoreVideo(video.id);
    }
  };

  const handleUnignore = (video) => {
    if (onIgnoreVideo) {
      onIgnoreVideo(video.id, false); // Second parameter false means unignore
    }
  };

  return (
    <div>
      <div className="history-header">
        <h2>Import Watch History</h2>
        <p className="section-description">
          Import your YouTube watch history from Google Takeout
        </p>
      </div>

      <div className="import-options">
        <div className="import-card">
          <h3>📁 Upload Google Takeout</h3>
          <p>
            Upload your Google Takeout file to import your YouTube watch history.
            Rate videos or ignore them to keep your list organized.
          </p>
          
          <FileUpload
            onFileParsed={handleFileParsed}
            onError={handleError}
          />
          
          {importStatus && (
            <div className="status status--success">
              {importStatus}
            </div>
          )}
          
          {error && (
            <div className="status status--error">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Import Statistics */}
      {importedVideos.length > 0 && (
        <div className="import-stats">
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-number">{importedVideos.length}</div>
              <div className="stat-label">Total Imported</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{unratedVideos.length}</div>
              <div className="stat-label">To Rate</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{ratedVideos.length}</div>
              <div className="stat-label">Rated</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{ignoredVideos.length}</div>
              <div className="stat-label">Ignored</div>
            </div>
          </div>
        </div>
      )}

      {/* Video Management */}
      {importedVideos.length > 0 && (
        <div className="imported-videos-section">
          <div className="section-controls">
            <h3>
              {showIgnored ? 
                `Ignored Videos (${ignoredVideos.length})` : 
                `Videos to Rate (${unratedVideos.length})`
              }
            </h3>
            
            <div className="view-controls">
              <button
                className={`btn btn--sm ${!showIgnored ? 'btn--primary' : 'btn--outline'}`}
                onClick={() => {
                  setShowIgnored(false);
                  setCurrentPage(0);
                }}
              >
                To Rate ({unratedVideos.length})
              </button>
              <button
                className={`btn btn--sm ${showIgnored ? 'btn--primary' : 'btn--outline'}`}
                onClick={() => {
                  setShowIgnored(true);
                  setCurrentPage(0);
                }}
              >
                Ignored ({ignoredVideos.length})
              </button>
            </div>
          </div>
          
          <p className="section-description">
            {showIgnored ? 
              'These videos have been ignored. You can unignore them to rate them later.' :
              'Rate these videos or ignore them to remove from this list.'
            }
          </p>

          {currentVideos.length > 0 ? (
            <>
              <VideoList
                videos={currentVideos}
                ratings={ratings}
                onRateVideo={onRateVideo}
                onIgnoreVideo={showIgnored ? handleUnignore : handleIgnore}
                showIgnoreButton={true}
                ignoreButtonText={showIgnored ? 'Unignore' : 'Ignore'}
                showLimit={null}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="btn btn--outline btn--sm"
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                  >
                    ← Previous
                  </button>
                  
                  <span className="pagination-info">
                    Page {currentPage + 1} of {totalPages}
                    ({videosToShow.length} videos)
                  </span>
                  
                  <button
                    className="btn btn--outline btn--sm"
                    onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage >= totalPages - 1}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <h3>{showIgnored ? 'No ignored videos' : 'No videos to rate'}</h3>
              <p>
                {showIgnored ? 
                  'You haven\'t ignored any videos yet.' :
                  'Great job! You\'ve rated all your imported videos.'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
