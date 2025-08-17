import { useState } from 'react';
import { useSession } from 'next-auth/react';
import VideoList from './VideoList';

export default function MusicSection({ onRateVideo, musicVideos, ratings }) {
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('imported'); // 'imported' or 'search'
  const { data: session } = useSession();

  // Filter music videos
  const importedMusicVideos = musicVideos ? musicVideos.filter(video => !video.ignored) : [];
  const unratedMusicVideos = importedMusicVideos.filter(video => !ratings[video.id]);
  const ratedMusicVideos = importedMusicVideos.filter(video => ratings[video.id]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchTerm + ' music')}&maxResults=20`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setSearchResults(data.videos || []);
      setActiveView('search');
    } catch (err) {
      setError(err.message || 'Failed to search music. Please try again.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
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

      {/* View Toggle */}
      <div className="music-view-toggle">
        <button
          className={`btn btn--sm ${activeView === 'imported' ? 'btn--primary' : 'btn--outline'}`}
          onClick={() => setActiveView('imported')}
        >
          🎵 Your Music ({importedMusicVideos.length})
        </button>
        <button
          className={`btn btn--sm ${activeView === 'search' ? 'btn--primary' : 'btn--outline'}`}
          onClick={() => setActiveView('search')}
        >
          🔍 Search Music
        </button>
      </div>

      {/* Music Stats */}
      {importedMusicVideos.length > 0 && activeView === 'imported' && (
        <div className="music-stats">
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-number">{importedMusicVideos.length}</div>
              <div className="stat-label">Music Videos</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{unratedMusicVideos.length}</div>
              <div className="stat-label">To Rate</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{ratedMusicVideos.length}</div>
              <div className="stat-label">Rated</div>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      {activeView === 'search' && (
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
            <button 
              type="submit" 
              className="btn btn--primary" 
              disabled={loading || !searchTerm.trim()}
            >
              {loading ? 'Searching...' : '🔍 Search Music'}
            </button>
          </form>
        </div>
      )}

      {/* Content Display */}
      <div className="music-content">
        {activeView === 'imported' ? (
          importedMusicVideos.length > 0 ? (
            <>
              <h3>🎵 Your Imported Music Videos</h3>
              <p className="section-description mb-16">
                These music videos were automatically detected from your YouTube watch history.
              </p>
              <VideoList
                videos={importedMusicVideos}
                ratings={ratings}
                onRateVideo={onRateVideo}
                showLimit={20}
              />
            </>
          ) : (
            <div className="music-placeholder">
              <div className="placeholder-content">
                <div className="music-icon">🎵</div>
                <h3>No Music Videos Found</h3>
                <p>No music videos were detected in your imported watch history. Try importing more data or search for music!</p>
                <button 
                  className="btn btn--primary"
                  onClick={() => setActiveView('search')}
                >
                  Search for Music
                </button>
              </div>
            </div>
          )
        ) : (
          // Search Results
          loading ? (
            <div className="loading-state">
              <p>🎵 Searching for music...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <>
              <h3>🎵 Music Search Results ({searchResults.length})</h3>
              <VideoList
                videos={searchResults}
                ratings={ratings}
                onRateVideo={onRateVideo}
                showLimit={null}
              />
            </>
          ) : (
            <div className="music-placeholder">
              <div className="placeholder-content">
                <div className="music-icon">🎵</div>
                <h3>Discover Amazing Music</h3>
                <p>Search for your favorite songs, artists, and albums above!</p>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
