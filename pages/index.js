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
    clearAllData,
    getVideoStats
  } = useVideos();

  const stats = getVideoStats();

  const handleImportComplete = (importedVideos) => {
    const result = addVideos(importedVideos);
    
    if (result && result.truncated) {
      setStorageWarning(`Large watch history detected! Showing most recent ${result.saved || 500} videos to keep the app running smoothly.`);
    }
    
    setActiveTab('import'); // Stay on import tab to show imported videos
  };

  const handleRateVideo = (video) => {
    if (!session) {
      setShowSignInModal(true);
      return;
    }
    setRatingModalVideo(video);
  };

  const handleSaveRating = (videoId, rating) => {
    rateVideo(videoId, rating);
    setRatingModalVideo(null);
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
          />
        );
      case 'music':
        return <MusicSection onRateVideo={handleRateVideo} />;
      case 'ratings':
        return (
          <RatingsSection
            videos={videos}
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
      </main>
    </>
  );
}
