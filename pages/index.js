import { useState } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import TabNavigation from '../components/TabNavigation';
import SearchSection from '../components/SearchSection';
import ImportSection from '../components/ImportSection';
import MusicSection from '../components/MusicSection';
import RatingsSection from '../components/RatingsSection';
import UserStatsSection from '../components/UserStatsSection';
import PrivacyDashboard from '../components/PrivacyDashboard';
import RecommendationsSection from '../components/RecommendationsSection';
import RatingModal from '../components/RatingModal';
import SignInModal from '../components/SignInModal';
import AuthButton from '../components/AuthButton';
import { useVideos } from '../hooks/useVideos';

export default function Home() {
  const [activeTab, setActiveTab] = useState('search');
  const [ratingModalVideo, setRatingModalVideo] = useState(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [storageWarning, setStorageWarning] = useState(null);
  const { data: session } = useSession();

  const {
    videos,
    ratings,
    loading,
    error,
    addVideos,
    rateVideo,
    ignoreVideo,
    clearAllData,
    getVideoStats,
    getMusicVideos,
    getRegularVideos
  } = useVideos();

  const stats = getVideoStats();
  const musicVideos = getMusicVideos();
  const regularVideos = getRegularVideos();

  const handleImportComplete = (importedVideos) => {
    const result = addVideos(importedVideos);

    if (result && result.truncated) {
      setStorageWarning(`Large watch history detected! Showing most recent ${result.saved || 500} videos to keep the app running smoothly.`);
    }

    // Stay on import tab to show the imported videos
    setActiveTab('import');
  };

  const handleRateVideo = (video) => {
    if (!session) {
      setShowSignInModal(true);
      return;
    }
    setRatingModalVideo(video);
  };

  const handleIgnoreVideo = (videoId, ignore = true) => {
    ignoreVideo(videoId, ignore);
  };

  const handleSaveRating = (videoId, rating) => {
    rateVideo(videoId, rating);
    setRatingModalVideo(null);

    // Auto-switch to appropriate tab after rating
    const ratedVideo = videos.find(v => v.id === videoId);
    if (ratedVideo && (ratedVideo.isMusic || isMusicVideo(ratedVideo))) {
      // If it's a music video, could switch to music tab
      // setActiveTab('music');
    } else {
      // For regular videos, could switch to ratings tab
      // setActiveTab('ratings');
    }
  };

  // Function to detect music videos (duplicate from VideoCard for consistency)
  const isMusicVideo = (video) => {
    const title = (video.title || '').toLowerCase();
    const channel = (video.channel || '').toLowerCase();
    const description = (video.description || '').toLowerCase();

    const musicKeywords = [
      'music', 'song', 'album', 'artist', 'band', 'official music video',
      'live performance', 'concert', 'acoustic', 'cover', 'remix',
      'soundtrack', 'single', 'ep', 'track', 'instrumental',
      'vevo', 'records'
    ];

    return musicKeywords.some(keyword => 
      title.includes(keyword) || channel.includes(keyword) || description.includes(keyword)
    );
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'search':
        return <SearchSection onRateVideo={handleRateVideo} />;

      case 'import':
        return (
          <ImportSection
            videos={videos}
            ratings={ratings}
            onImportComplete={handleImportComplete}
            onRateVideo={handleRateVideo}
            onIgnoreVideo={handleIgnoreVideo}
          />
        );

      case 'music':
        return (
          <MusicSection 
            onRateVideo={handleRateVideo}
            musicVideos={musicVideos}
            ratings={ratings}
          />
        );

      case 'ratings':
        return (
          <RatingsSection
            videos={regularVideos} // Show only non-music videos
            ratings={ratings}
            onRateVideo={handleRateVideo}
            stats={stats}
          />
        );

      case 'stats':
        return (
          <UserStatsSection
            videos={videos}
            ratings={ratings}
          />
        );

      case 'privacy':
        return <PrivacyDashboard />;

      case 'recommendations':
        return <RecommendationsSection />;

      default:
        return <SearchSection onRateVideo={handleRateVideo} />;
    }
  };

  return (
    <>
      <Head>
        <title>YouTube Video Rating App</title>
        <meta name="description" content="Rate and manage your YouTube watch history securely" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container">
        <header className="header">
          <div className="header-content">
            <h1 className="app-title">YouTube Video Rating</h1>
            <p className="app-subtitle">
              Rate and manage your YouTube watch history securely
            </p>
          </div>
          <div className="user-section">
            <AuthButton />
          </div>
        </header>

        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Storage Warning */}
        {storageWarning && (
          <div className="status status--warning mb-16">
            <strong>Storage Notice:</strong> {storageWarning}
            <button 
              onClick={() => setStorageWarning(null)} 
              className="btn btn--outline btn--sm"
              style={{ marginLeft: '8px' }}
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="tab-content">
          {loading && (
            <div className="loading-state">
              <p>Loading your data...</p>
            </div>
          )}
          {error && <div className="status status--error">{error}</div>}
          {renderActiveTab()}
        </div>

        <RatingModal
          video={ratingModalVideo}
          isOpen={!!ratingModalVideo}
          onClose={() => setRatingModalVideo(null)}
          onSave={handleSaveRating}
        />

        <SignInModal
          isOpen={showSignInModal}
          onClose={() => setShowSignInModal(false)}
        />

        {process.env.NODE_ENV === 'development' && (
          <div style={{ position: 'fixed', bottom: '20px', right: '20px' }}>
            <button onClick={clearAllData} className="btn btn--outline btn--sm">
              Clear All Data (Dev)
            </button>
          </div>
        )}
      </main>
    </>
  );
}
