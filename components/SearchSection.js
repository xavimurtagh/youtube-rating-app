import { useState } from 'react';
import { useSession } from 'next-auth/react';
import VideoList from './VideoList';

export default function SearchSection({ onRateVideo }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { data: session } = useSession();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const query = category === 'all' ? searchTerm : `${searchTerm} ${category}`;
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}&maxResults=20`);

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setSearchResults(data.videos);
    } catch (err) {
      setError('Failed to search videos. Please try again.');
      console.error('Search error:', err);
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
          <option value="tech">Technology</option>
        </select>
        <button type="submit" className="btn btn--primary" disabled={loading}>
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
          <p>Searching videos...</p>
        ) : searchResults.length > 0 ? (
          <VideoList
            videos={searchResults}
            ratings={{}}
            onRateVideo={onRateVideo}
            showLimit={null}
          />
        ) : searchTerm && !loading ? (
          <p>No videos found for "{searchTerm}". Try adjusting your search criteria.</p>
        ) : (
          <p>Enter a search term to find YouTube videos</p>
        )}
      </div>
    </div>
  );
}
