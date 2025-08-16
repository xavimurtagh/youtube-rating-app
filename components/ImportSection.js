import { useState } from 'react';
import FileUpload from './FileUpload';

export default function ImportSection({ onImportComplete }) {
  const [importStatus, setImportStatus] = useState(null);
  const [error, setError] = useState(null);

  const handleFileParsed = (result) => {
    setImportStatus(`Successfully imported ${result.videos.length} videos`);
    setError(null);
    onImportComplete(result.videos);
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    setImportStatus(null);
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
            </div>
          )}
        </div>

        <div className="import-card">
          <h3>📝 Manual Entry</h3>
          <p>
            Upload your Google Takeout file or add URLs manually
          </p>
          <button className="btn btn--outline" disabled>
            Add URLs Manually (Coming Soon)
          </button>
        </div>
      </div>

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
