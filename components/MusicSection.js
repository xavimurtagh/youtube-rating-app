import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import VideoList from './VideoList';

export default function MusicSection({ onRateVideo, musicVideos, ratings }) {
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('imported');
  const [filterType, setFilterType] = useState('all'); // 'all', 'rated', 'unrated'
  const { data: session } = useSession();

  // Filter music videos only - no regular videos
  const importedMusicVideos = musicVideos ? musicVideos.filter(video => !video.ignored) : [];
  
  // Apply filter based on rating status
  const getFilteredMusicVideos = () => {
    switch (filterType) {
      case 'rated':
        return importedMusicVideos.filter(video => ratings[video.id]);
      case 'unrated':
        return importedMusicVideos.filter(video => !ratings[video.id]);
      default:
        return importedMusicVideos;
    }
  };

  const filteredMusicVideos = getFilteredMusicVideos();
  const unratedMusicVideos = importedMusicVideos.filter(video => !ratings[video.id]);
  const ratedMusicVideos = importedMusicVideos.filter(video => ratings[video.id]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const musicQuery = `${searchTerm} music official`;
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(musicQuery)}&maxResults=20`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      // Filter results to prioritize music content
      const musicResults = data.videos ? data.videos.filter(video => {
        const title = (video.title || '').toLowerCase();
        const channel = (video.channel || '').toLowerCase();
        return title.includes('music') || title.includes('official') || 
               channel.includes('vevo') || channel.includes('records') ||
               title.includes('song') || title.includes('album');
      }) : [];
      
      setSearchResults(musicResults);
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
          Discover and rate music videos based on your taste
        </p>
      </div>

      {/* View Toggle */}
      <div className="music-view-toggle">
        <button
          className={`btn btn--md ${activeView === 'imported' ? 'btn--primary' : 'btn--outline'}`}
          onClick={() => setActiveView('imported')}
        >
          🎵 Your Music Library ({importedMusicVideos.length})
        </button>
        <button
          className={`btn btn--md ${activeView === 'search' ? 'btn--primary' : 'btn--outline'}`}
          onClick={() => setActiveView('search')}
        >
          🔍 Discover New Music
        </button>
      </div>

      {/* Music Stats and Filters */}
      {importedMusicVideos.length > 0 && activeView === 'imported' && (
        <div className="music-stats-and-filters">
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
          
          {/* Filter Buttons */}
          <div className="music-filters">
            <div className="filter-group">
              <span className="filter-label">Show:</span>
              <button
                className={`btn btn--sm ${filterType === 'all' ? 'btn--primary' : 'btn--outline'}`}
                onClick={() => setFilterType('all')}
              >
                All Music ({importedMusicVideos.length})
              </button>
              <button
                className={`btn btn--sm ${filterType === 'unrated' ? 'btn--primary' : 'btn--outline'}`}
                onClick={() => setFilterType('unrated')}
              >
                To Rate ({unratedMusicVideos.length})
              </button>
              <button
                className={`btn btn--sm ${filterType === 'rated' ? 'btn--primary' : 'btn--outline'}`}
                onClick={() => setFilterType('rated')}
              >
                Rated ({ratedMusicVideos.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Form */}
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
          filteredMusicVideos.length > 0 ? (
            <>
              <h3>
                🎵 {filterType === 'all' ? 'All Music Videos' : 
                     filterType === 'rated' ? 'Rated Music Videos' : 
                     'Music Videos to Rate'}
              </h3>
              <VideoList
                videos={filteredMusicVideos}
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
                <p>Try searching for new music or import your YouTube history.</p>
              </div>
            </div>
          )
        ) : (
          // Search Results
          searchResults.length > 0 ? (
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
