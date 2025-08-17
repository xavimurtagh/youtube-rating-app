import { useState } from 'react';
import VideoList from './VideoList';

export default function SearchSection({ onRateVideo }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const query = category === 'all' ? searchTerm : `${searchTerm} ${category}`;
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}&maxResults=20`);

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('YouTube API quota exceeded. Please try again later.');
        }
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      setSearchResults(data.videos || []);
    } catch (err) {
      setError(err.message || 'Failed to search videos. Please try again.');
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-section">
      <div className="search-header">
        <h2>Search YouTube Videos</h2>
        <p className="section-description">
          Search and rate YouTube videos securely
        </p>
      </div>

      <form onSubmit={handleSearch} className="search-bar">
        <input
          type="text"
          placeholder="Search for videos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-control search-input"
          disabled={loading}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="form-control category-select"
          disabled={loading}
        >
          <option value="all">All Categories</option>
          <option value="music">Music</option>
          <option value="gaming">Gaming</option>
          <option value="education">Education</option>
          <option value="entertainment">Entertainment</option>
          <option value="technology">Technology</option>
          <option value="sports">Sports</option>
          <option value="news">News</option>
          <option value="comedy">Comedy</option>
        </select>
        <button type="submit" className="btn btn--primary" disabled={loading || !searchTerm.trim()}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="status status--error mb-16">
          {error}
        </div>
      )}

      <div className="search-results">
        {loading ? (
          <div className="loading-state">
            <p>🔍 Searching YouTube for "{searchTerm}"...</p>
          </div>
        ) : hasSearched && searchResults.length > 0 ? (
          <>
            <p className="mb-16">Found {searchResults.length} videos for "{searchTerm}"</p>
            <VideoList
              videos={searchResults}
              ratings={{}}
              onRateVideo={onRateVideo}
              showLimit={null}
            />
          </>
        ) : hasSearched && searchResults.length === 0 && !error ? (
          <div className="empty-state">
            <h3>No videos found</h3>
            <p>No videos found for "{searchTerm}". Try different keywords or check your spelling.</p>
          </div>
        ) : !hasSearched ? (
          <div className="search-placeholder">
            <div className="placeholder-icon">🔍</div>
            <h3>Search YouTube Videos</h3>
            <p>Enter a search term above to find YouTube videos you can rate and add to your collection.</p>
            <div className="search-tips">
              <h4>Search Tips:</h4>
              <ul>
                <li>Try specific video titles or channel names</li>
                <li>Use category filters to narrow results</li>
                <li>Search for topics you're interested in</li>
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
