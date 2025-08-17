import { useState } from 'react';
import FileUpload from './FileUpload';
import VideoList from './VideoList';

export default function ImportSection({ 
  videos, 
  ratings, 
  ignoredIds,
  onImportComplete, 
  onRateVideo, 
  onIgnoreVideo 
}) {
  const [importStatus, setImportStatus] = useState(null);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [sortOrder, setSortOrder] = useState('newest');
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

  // Get videos that need rating (not rated and not ignored)
  const importedVideos = videos.filter(video => video.watchedAt);
  let videosToRate = importedVideos.filter(
    video => !ratings[video.id] && !ignoredIds.includes(video.id)
  );
  videosToRate = videosToRate.sort((a,b) => {
    const ta = new Date(a.watchedAt).getTime();
    const tb = new Date(b.watchedAt).getTime();
    return sortOrder==='newest' ? tb - ta : ta - tb;
  });
  
  const ratedVideos = importedVideos.filter(video => ratings[video.id]);
  const ignoredVideos = importedVideos.filter(video => video.ignored);

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
    <div>
      <div className="history-header">
        <h2>Import Watch History</h2>
        <p className="section-description">
          Import your YouTube watch history from Google Takeout and rate or ignore videos
        </p>
      </div>

      <div className="import-options">
        <div className="import-card">
          <h3>📁 Upload Google Takeout</h3>
          <p>
            Upload your Google Takeout file to import your YouTube watch history.
            You can then rate videos or ignore them to keep your list organized.
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
              {error.includes('quota') && (
                <div className="error-help">
                  <p>💡 <strong>Large file detected:</strong> Your watch history has been truncated to the most recent videos.</p>
                </div>
              )}
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
              <div className="stat-number">{videosToRate.length}</div>
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
            <h3>Videos to Rate ({videosToRate.length})</h3>
            <p className="section-description">
              Rate these videos or ignore them to remove them from this list. 
              Music videos will appear in the Music tab after rating.
            </p>
          </div>


          {currentVideos.length > 0 ? (
            <>
              <div className="sort-controls" style={{ marginBottom: '16px' }}>
                <label style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  Sort:
                  <select
                    value={sortOrder}
                    onChange={e => setSortOrder(e.target.value)}
                    className="form-control filter-select"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </label>
              </div>
              <VideoList
                videos={currentVideos}
                ratings={ratings}
                onRateVideo={onRateVideo}
                showIgnoreButton={true}
                onIgnoreVideo={handleIgnore}
                ignoreButtonText="Ignore"
                showLimit={null}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="btn btn--outline btn--sm"
                    onClick={handlePrevPage}
                    disabled={currentPage === 0}
                  >
                    ← Previous
                  </button>

                  <span className="pagination-info">
                    Page {currentPage + 1} of {totalPages} 
                    ({videosToRate.length} videos to rate)
                  </span>

                  <button
                    className="btn btn--outline btn--sm"
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages - 1}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <h3>🎉 All Videos Processed!</h3>
              <p>
                You've rated or ignored all your imported videos. 
                Great job organizing your watch history!
              </p>
              <div className="next-steps">
                <p>What's next?</p>
                <ul>
                  <li>Check your <strong>Ratings</strong> tab to see all rated videos</li>
                  <li>Visit the <strong>Music</strong> tab for your rated music videos</li>
                  <li>View your <strong>Statistics</strong> to see your viewing patterns</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="import-help">
        <details>
          <summary>How to get your Google Takeout file</summary>
          <ol>
            <li>Go to <a href="https://takeout.google.com" target="_blank" rel="noopener noreferrer">Google Takeout</a></li>
            <li>Select "YouTube and YouTube Music"</li>
            <li>Choose "history" in the YouTube data options</li>
            <li>Select JSON format</li>
            <li>Download your archive</li>
            <li>Extract and upload the "watch-history.json" file here</li>
          </ol>

          <div className="import-tips">
            <h4>💡 Tips for better organization:</h4>
            <ul>
              <li><strong>Rate videos</strong> to track your preferences and get recommendations</li>
              <li><strong>Ignore videos</strong> to hide them permanently from your rating list</li>
              <li><strong>Music videos</strong> are automatically detected and organized in the Music tab</li>
              <li><strong>Regular videos</strong> appear in the Ratings tab after being rated</li>
              <li>Your ratings persist across browser sessions</li>
            </ul>
          </div>
        </details>
      </div>
    </div>
  );
}
