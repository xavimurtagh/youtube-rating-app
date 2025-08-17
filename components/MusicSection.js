import { useState } from 'react';
import { useSession } from 'next-auth/react';
import VideoList from './VideoList';

export default function MusicSection({ onRateVideo }) {
  const [musicVideos, setMusicVideos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [musicGenre, setMusicGenre] = useState('all');
  const { data: session } = useSession();

  const musicGenres = [
    { value: 'all', label: 'All Music' },
    { value: 'pop', label: 'Pop' },
    { value: 'rock', label: 'Rock' },
    { value: 'hip hop', label: 'Hip Hop' },
    { value: 'electronic', label: 'Electronic' },
    { value: 'jazz', label: 'Jazz' },
    { value: 'classical', label: 'Classical' },
    { value: 'country', label: 'Country' },
    { value: 'r&b', label: 'R&B' },
    { value: 'indie', label: 'Indie' },
  ];

  const popularSearches = [
    'trending music 2025',
    'top hits this week',
    'new music releases',
    'billboard hot 100',
    'spotify top 50',
  ];

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const musicQuery = musicGenre === 'all' 
        ? `${searchTerm} music` 
        : `${searchTerm} ${musicGenre} music`;
      
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(musicQuery)}&maxResults=20`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setMusicVideos(data.videos || []);
    } catch (err) {
      setError(err.message || 'Failed to search music. Please try again.');
      setMusicVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSearch = (query) => {
    setSearchTerm(query);
  };

  if (!session) {
    return (
      <div className="auth-required">
        <div className="auth-prompt">
          <h2>🎵 Sign In for Music Features</h2>
          <p>Sign in to rate music, get personalized recommendations, and discover new songs!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="music-section">
      <div className="music-header">
        <h2>🎵 Music & Songs</h2>
        <p className="section-description">
          Discover, rate, and get recommendations for music based on your taste
        </p>
      </div>

      {/* Music Search */}
      <div className="music-search">
        <form onSubmit={handleSearch} className="search-bar">
          <input
            type="text"
            placeholder="Search for songs, artists, or albums..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-control search-input"
            disabled={loading}
          />
          <select
            value={musicGenre}
            onChange={(e) => setMusicGenre(e.target.value)}
            className="form-control music-genre-select"
            disabled={loading}
          >
            {musicGenres.map(genre => (
              <option key={genre.value} value={genre.value}>
                {genre.label}
              </option>
            ))}
          </select>
          <button 
            type="submit" 
            className="btn btn--primary" 
            disabled={loading || !searchTerm.trim()}
          >
            {loading ? 'Searching...' : '🔍 Search Music'}
          </button>
        </form>
        
        {/* Quick Search Suggestions */}
        <div className="quick-searches">
          <span className="quick-label">Popular:</span>
          {popularSearches.map((query, index) => (
            <button
              key={index}
              onClick={() => handleQuickSearch(query)}
              className="btn btn--outline btn--sm quick-search-btn"
              disabled={loading}
            >
              {query}
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="status status--error mb-16">
          {error}
        </div>
      )}

      {/* Search Results */}
      <div className="music-results">
        {loading ? (
          <div className="loading-state">
            <p>🎵 Searching for music...</p>
          </div>
        ) : musicVideos.length > 0 ? (
          <>
            <h3>🎵 Music Search Results ({musicVideos.length})</h3>
            <VideoList
              videos={musicVideos}
              ratings={{}}
              onRateVideo={onRateVideo}
              showLimit={null}
            />
          </>
        ) : (
          <div className="music-placeholder">
            <div className="placeholder-content">
              <div className="music-icon">🎵</div>
              <h3>Discover Amazing Music</h3>
              <p>Search for your favorite songs, artists, and albums. Rate them to get personalized recommendations!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
