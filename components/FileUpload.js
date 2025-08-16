import { useState } from 'react';
import { parseGoogleTakeoutFile, validateTakeoutFile } from '../utils/googleTakeout';

export default function FileUpload({ onFileParsed, onError }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file
    const validation = validateTakeoutFile(file);
    if (!validation.valid) {
      onError(validation.error);
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Simulate progress for user experience
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const result = await parseGoogleTakeoutFile(file);

      clearInterval(progressInterval);
      setProgress(100);

      setTimeout(() => {
        onFileParsed(result);
        setUploading(false);
        setProgress(0);
      }, 500);

    } catch (error) {
      setUploading(false);
      setProgress(0);
      onError(error.message);
    }
  };

  return (
    <div className="file-upload-area">
      <input
        type="file"
        accept=".json,.html"
        onChange={handleFileSelect}
        className="file-input"
        id="takeout-file"
        disabled={uploading}
      />
      <label htmlFor="takeout-file" className="file-upload-label">
        <div className="upload-icon">📁</div>
        <div className="upload-text">
          {uploading ? 'Processing...' : 'Choose Google Takeout File'}
        </div>
        <small>Select your YouTube watch history JSON file</small>
      </label>

      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="progress-text">
            Processing file... {progress}%
          </div>
        </div>
      )}
    </div>
  );
}
