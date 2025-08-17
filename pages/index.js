import { useState } from 'react';
import Head from 'next/head';
import { SessionProvider } from 'next-auth/react';
import TabNavigation from '../components/TabNavigation';
import SearchSection from '../components/SearchSection';
import ImportSection from '../components/ImportSection';
import RatingsSection from '../components/RatingsSection';
import PrivacyDashboard from '../components/PrivacyDashboard';
import RecommendationsSection from '../components/RecommendationsSection';
import RatingModal from '../components/RatingModal';
import AuthButton from '../components/AuthButton';
import { useVideos } from '../hooks/useVideos';

function HomeContent() {
  const [activeTab, setActiveTab] = useState('search');
  const [ratingModalVideo, setRatingModalVideo] = useState(null);

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
    addVideos(importedVideos);
    setActiveTab('ratings');
  };

  const handleRateVideo = (video) => {
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
        return <ImportSection onImportComplete={handleImportComplete} />;
      case 'ratings':
        return (
          <RatingsSection
            videos={videos}
            ratings={ratings}
            onRateVideo={handleRateVideo}
            stats={stats}
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

      <div className="tab-content">
        {loading && <p>Loading...</p>}
        {error && <div className="status status--error">{error}</div>}
        {renderActiveTab()}
      </div>

      <RatingModal
        video={ratingModalVideo}
        isOpen={!!ratingModalVideo}
        onClose={() => setRatingModalVideo(null)}
        onSave={handleSaveRating}
      />

      {process.env.NODE_ENV === 'development' && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px' }}>
          <button onClick={clearAllData} className="btn btn--outline btn--sm">
            Clear All Data (Dev)
          </button>
        </div>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <>
      <Head>
        <title>YouTube Video Rating App</title>
        <meta name="description" content="Rate and manage your YouTube watch history securely" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <SessionProvider>
        <HomeContent />
      </SessionProvider>
    </>
  );
}
