import React, { useEffect, useState } from 'react';
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
import FriendsSection from '../components/FriendsSection';
import FavoritesSection from '../components/FavoritesSection';
import SocialFeedSection from '../components/SocialFeedSection';
import VideoDetailsModal from '../components/VideoDetailsModal';
import AIRecommendationsSection from '../components/AIRecommendationsSection';
import ThemeToggle from '../components/ThemeToggle';
import { useVideos } from '../hooks/useVideos';

export default function Home() {
  const [activeTab, setActiveTab] = useState('search');
  const [ratingModalVideo, setRatingModalVideo] = useState(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [storageWarning, setStorageWarning] = useState(null);
  const [videoDetailsModal, setVideoDetailsModal] = useState(null);

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
    getRegularVideos,
    clearUnrated,
    updateLocalRating,
    removeRating,
    setRatingsFromDatabase,
    ignoredIds
  } = useVideos();

  const stats = getVideoStats();
  const musicVideos = getMusicVideos();
  const regularVideos = getRegularVideos();

  const handleImportComplete = (importedVideos) => {
    const result = addVideos(importedVideos);
    
    if (result && result.truncated) {
      setStorageWarning(`Large watch history detected! Showing most recent ${result.saved || 500} videos to keep the app running smoothly.`);
    }
    
    setActiveTab('import');
  };

  const loadRatingsFromDatabase = async () => {
    if (!session) return;
  
    try {
      const response = await fetch('/api/my-ratings', {
        credentials: 'include',
      });
      if (response.ok) {
        const dbRatings = await response.json();
        setRatingsFromDatabase(dbRatings);  // Use the hook method
        console.log(`Loaded ${dbRatings.length} ratings from database`);
      }
    } catch (error) {
      console.error('Failed to load ratings from database:', error);
    }
  };
  
  // Call this on app load
  useEffect(() => {
    if (session) {
      loadRatingsFromDatabase();
    }
  }, [session]);


  const handleRateVideo = async (video, rating) => {
    const score = typeof rating === 'object' && rating.rating != null
      ? rating.rating
      : rating;
  
    try {
      const response = await fetch('/api/rate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video, score }),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
  
      updateLocalRating(video.id, score);
  
      console.log('Rating saved successfully:', video.id, score);
    } catch (error) {
      console.error('Failed to save rating:', error);
      alert('Failed to save rating. Please try again.');
    }
  };

  const migrateLocalRatingsToDatabase = async () => {
    const localRatings = localStorage.getItem('youtube_rating_ratings');
    if (!localRatings) return;
  
    const ratings = JSON.parse(localRatings);
    const entries = Object.entries(ratings);
    
    if (entries.length === 0) return;
  
    console.log(`Migrating ${entries.length} ratings from localStorage to database...`);
    
    let successCount = 0;
    let errorCount = 0;
  
    for (const [videoId, ratingObj] of entries) {
      try {
        const video = videos.find(v => v.id === videoId) || {
          id: videoId,
          title: 'Migrated Video',
          channel: 'Unknown Channel'
        };
        
        // Remove this line: await handleRateVideo(video, ratingObj);
        await handleRateVideo(video, ratingObj.rating);
        successCount++;
        
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to migrate rating for video ${videoId}:`, error);
        errorCount++;
      }
    }

  
    alert(`Migration completed! ${successCount} ratings saved, ${errorCount} failed.`);
  };
  
  // Add this useEffect to trigger migration on load (run once)
  useEffect(() => {
    const hasRunMigration = localStorage.getItem('ratings_migrated');
    if (session && !hasRunMigration) {
      const shouldMigrate = confirm(
        'We found existing ratings in your browser storage. Would you like to sync them to your account? (This only needs to be done once)'
      );
      if (shouldMigrate) {
        migrateLocalRatingsToDatabase().then(() => {
          localStorage.setItem('ratings_migrated', 'true');
        });
      } else {
        localStorage.setItem('ratings_migrated', 'skipped');
      }
    }
  }, [session, videos]);



  const handleVideoClick = async (video, videoStats) => {
    setVideoDetailsModal({ video, videoStats });
  };

  const handleIgnoreVideo = (videoId, ignore = true) => {
    console.log('Ignoring video:', videoId);
    try {
      ignoreVideo(videoId, ignore);
      console.log('Successfully ignored video:', videoId);
    } catch (error) {
      console.error('Failed to ignore video:', videoId, error);
    }
  };

  const handleSaveRating = (videoOrId, rating) => {
    const videoObj = typeof videoOrId === 'object' ? videoOrId : videos.find(v => v.id === videoOrId);
    if (videoObj && !videos.some(v => v.id === videoObj.id)) {
      addVideos([videoObj]);
    }
    rateVideo(videoObj.id, rating);
    setRatingModalVideo(null);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'search':
        return <SearchSection onRateVideo={video => setRatingModalVideo(video)} />;
      
      case 'import':
        return (
          <ImportSection
            videos={videos}
            ratings={ratings}
            ignoredIds={ignoredIds}
            onImportComplete={handleImportComplete}
            onRateVideo={video => setRatingModalVideo(video)}
            onIgnoreVideo={handleIgnoreVideo}
            clearUnrated={clearUnrated}
          />
        );
      
      case 'music':
        return (
          <MusicSection
            onRateVideo={video => setRatingModalVideo(video)}
            musicVideos={musicVideos}
            ratings={ratings}
            onIgnoreVideo={ignoreVideo}
          />
        );
      
      case 'ratings':
        return (
          <RatingsSection
            videos={videos}
            ratings={ratings}
            onRateVideo={video => setRatingModalVideo(video)}
            onRemoveRating={removeRating}  // Add this line
            onVideoClick={handleVideoClick}
          />
        );
      
      case 'friends':
        return <FriendsSection />;
      
      case 'favorites':
        return (
          <FavoritesSection 
            ratings={ratings}
            videos={videos}
            onRateVideo={video => setRatingModalVideo(video)}
            onRemoveRating={removeRating}  // Add this if FavoritesSection needs it too
          />
        );
      
      case 'feed':
        return <SocialFeedSection />;
      
      case 'stats':
        return <UserStatsSection videos={videos} ratings={ratings} />;
      
      case 'privacy':
        return <PrivacyDashboard onClearData={clearAllData} />;
      
      case 'ai':
        return (
          <AIRecommendationsSection
            videos={videos}
            ratings={ratings}
            onRateVideo={video => setRatingModalVideo(video)}
          />
        );
      
      default:
        return <SearchSection onRateVideo={video => setRatingModalVideo(video)} />;
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

      <main className="app-container">
        {/* Top Header with Sign In/Out */}
        <div className="app-header">
          <div className="header-content">
            <div className="header-left">
              <h1>YouTube Video Rating</h1>
              <p>Rate and manage your YouTube watch history securely</p>
            </div>
            <div className="header-right">
              <ThemeToggle />
              <AuthButton />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
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
        
        {/* Main Content */}
        <div className="main-content">
          {loading && (
            <div className="loading-state">
              <p>Loading your data...</p>
            </div>
          )}
          {error && <div className="status status--error">{error}</div>}
          {renderActiveTab()}
        </div>

        {ratingModalVideo && (
          <RatingModal
            video={ratingModalVideo}
            isOpen={true}
            onSave={(video, score) => {
              handleRateVideo(video, score);
              setRatingModalVideo(null);
            }}
            onClose={() => setRatingModalVideo(null)}
          />
        )}


        <SignInModal
          isOpen={showSignInModal}
          onClose={() => setShowSignInModal(false)}
        />

        {videoDetailsModal && (
          <VideoDetailsModal
            video={videoDetailsModal.video}
            videoStats={videoDetailsModal.videoStats}
            onRate={(video, score) => {
              handleRateVideo(video, score);
              setVideoDetailsModal(null);
            }}
            onClose={() => setVideoDetailsModal(null)}
          />
        )}

        
        {process.env.NODE_ENV === 'development' && (
          <div className="dev-tools">
            <button onClick={clearAllData} className="btn btn--outline btn--sm">
              Clear All Data (Dev)
            </button>
          </div>
        )}

        {(session) && (
          <div className="bookmarklet-section-prominent">
            <div className="bookmarklet-header">
              <h2>📌 Rate Videos While Watching YouTube</h2>
              <p className="bookmarklet-description">
                Never forget to rate a video again! Drag the button below to your bookmarks bar.
              </p>
            </div>
            
            <div className="bookmarklet-demo">
              <div className="bookmarklet-step">
                <span className="step-number">1</span>
                <p>Drag this button to your bookmarks bar:</p>
                <a 
                  href={`javascript:(function(){
                    try {
                      var videoId = new URLSearchParams(window.location.search).get('v');
                      if (!videoId || window.location.hostname !== 'www.youtube.com') {
                        alert('This bookmarklet only works on YouTube video pages!\\n\\nMake sure you are on a page like: youtube.com/watch?v=...');
                        return;
                      }
                      
                      // Better title extraction with fallbacks
                      var title = '';
                      var titleSelectors = [
                        'h1.ytd-video-primary-info-renderer yt-formatted-string',
                        'h1.title.style-scope.ytd-video-primary-info-renderer',
                        '#container h1',
                        '.title'
                      ];
                      
                      for (var i = 0; i < titleSelectors.length; i++) {
                        var titleElement = document.querySelector(titleSelectors[i]);
                        if (titleElement && titleElement.textContent) {
                          title = titleElement.textContent.trim();
                          break;
                        }
                      }
                      
                      if (!title) {
                        title = document.title.replace(' - YouTube', '') || 'Unknown Video';
                      }
                      
                      // Better channel extraction
                      var channel = '';
                      var channelSelectors = [
                        'ytd-video-owner-renderer .ytd-channel-name a',
                        '#owner-text a',
                        '.ytd-channel-name a'
                      ];
                      
                      for (var i = 0; i < channelSelectors.length; i++) {
                        var channelElement = document.querySelector(channelSelectors[i]);
                        if (channelElement && channelElement.textContent) {
                          channel = channelElement.textContent.trim();
                          break;
                        }
                      }
                      
                      if (!channel) {
                        channel = 'Unknown Channel';
                      }
                      
                      var thumbnail = 'https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg';
                      var rateUrl = '${typeof window !== 'undefined' ? window.location.origin : 'https://youtube-rating-app.vercel.app'}/rate?videoId=' + 
                                    encodeURIComponent(videoId) + 
                                    '&title=' + encodeURIComponent(title) + 
                                    '&channel=' + encodeURIComponent(channel) + 
                                    '&thumbnail=' + encodeURIComponent(thumbnail);
                      
                      window.open(rateUrl, 'rate-video', 'width=600,height=700,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no');
                      
                    } catch (error) {
                      console.error('Bookmarklet error:', error);
                      alert('Error: ' + error.message);
                    }
                  })();`}
                  className="bookmarklet-button-prominent"
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", e.target.href);
                  }}
                >
                  🎬 Rate This YouTube Video
                </a>
              </div>
              
              <div className="bookmarklet-step">
                <span className="step-number">2</span>
                <p>While watching any YouTube video, click the bookmark to rate it instantly!</p>
              </div>
            </div>
            
            <div className="bookmarklet-benefits">
              <h4>Why use this?</h4>
              <ul>
                <li>✅ Rate videos without leaving YouTube</li>
                <li>✅ Works on any YouTube video page</li>
                <li>✅ Automatically captures video info</li>
                <li>✅ Quick and convenient</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
