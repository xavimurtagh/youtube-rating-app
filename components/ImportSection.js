import { useState } from 'react';
import FileUpload from './FileUpload';
import VideoList from './VideoList';

export default function ImportSection({ videos, ratings, onImportComplete, onRateVideo }) {
  const [importStatus, setImportStatus] = useState(null);
  const [error, setError] = useState(null);

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

  const importedVideos = videos.filter(video => video.watchedAt);
  const hasImportedVideos = importedVideos.length > 0;

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
            This will allow you to rate videos you've previously watched.
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
                  <p>💡 <strong>Large file detected:</strong> Your watch history has been truncated to the most recent videos to fit storage limits.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Show imported videos */}
      {hasImportedVideos && (
        <div className="imported-videos-section">
          <h3>Your Imported Videos ({importedVideos.length} total)</h3>
          <p className="section-description">
            These are videos from your YouTube watch history. Click "Rate Video" to rate them!
          </p>
          
          <VideoList
            videos={importedVideos.slice(0, 50)}
            ratings={ratings}
            onRateVideo={onRateVideo}
            showLimit={null}
          />
          
          {importedVideos.length > 50 && (
            <div className="load-more-section">
              <p>{importedVideos.length - 50} more imported videos available in the Ratings tab</p>
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
        </details>
      </div>
    </div>
  );
}
