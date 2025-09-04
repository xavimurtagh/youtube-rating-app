import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

export default function PrivacyDashboard() {
  const { data: session } = useSession();
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: false,
    personalization: true,
    marketing: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load preferences only on client side
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('youtube_rating_privacy');
        if (saved) {
          setPreferences(JSON.parse(saved));
        }
      } catch (error) {
        console.warn('Failed to load privacy preferences:', error);
      }
    }
    setLoading(false);
  }, []);

  const updatePreference = (key, value) => {
    const newPreferences = {
      ...preferences,
      [key]: value
    };
    setPreferences(newPreferences);
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('youtube_rating_privacy', JSON.stringify(newPreferences));
      } catch (error) {
        console.warn('Failed to save privacy preferences:', error);
      }
    }
  };

  const resetToDefaults = () => {
    const defaultPreferences = {
      essential: true,
      analytics: false,
      personalization: false,
      marketing: false
    };
    setPreferences(defaultPreferences);
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('youtube_rating_privacy', JSON.stringify(defaultPreferences));
      } catch (error) {
        console.warn('Failed to reset privacy preferences:', error);
      }
    }
  };

  const securityFeatures = [
    {
      title: 'Google OAuth2 Authentication',
      description: 'Secure sign-in using your existing Google account',
      active: !!session
    },
    {
      title: 'Client-Side Data Storage',
      description: 'All data stored locally in your browser',
      active: true
    },
    {
      title: 'No Password Storage',
      description: 'We never see or store your password - handled by Google',
      active: true
    },
    {
      title: 'Secure Sessions',
      description: 'Session tokens handled securely by NextAuth',
      active: true
    }
  ];

  const privacySettings = [
    {
      key: 'essential',
      title: 'Essential Functionality',
      description: 'Required for basic app functionality',
      required: true
    },
    {
      key: 'analytics',
      title: 'Usage Analytics',
      description: 'Help us improve the app experience (optional)',
      required: false
    },
    {
      key: 'personalization',
      title: 'Personalized Recommendations',
      description: 'Use your ratings for better suggestions (optional)',
      required: false
    },
    {
      key: 'marketing',
      title: 'Feature Updates',
      description: 'Notifications about new features (optional)',
      required: false
    }
  ];

  const handleExportData = () => {
    if (typeof window === 'undefined') return;
    
    try {
      const data = {
        videos: JSON.parse(localStorage.getItem('youtube_rating_videos') || '[]'),
        ratings: JSON.parse(localStorage.getItem('youtube_rating_ratings') || '{}'),
        preferences: preferences,
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `youtube-rating-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const handleDeleteAllData = async () => {
    if (!confirm('⚠️ This will permanently delete your video data including ratings, favorites')) {
      return;
    }

    const confirmText = window.prompt('Type "DELETE" to confirm you want to delete all your data:');
    if (confirmText?.toUpperCase() !== 'DELETE') {
      alert('Deletion cancelled.');
      return;
    }

    setLoading(true);
    
    try {
      // Clear database data
      const response = await fetch('/api/clear-all-data', {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear database data');
      }

      // Clear local storage as backup
      localStorage.clear();
      sessionStorage.clear();
      handleClearLocalData();

      alert('✅ All your data has been deleted from our servers and your browser.');
      
      // Sign out and reload
      window.location.reload();
      
    } catch (error) {
      console.error('Failed to clear data:', error);
      alert(`❌ Failed to clear all data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearLocalData = async () => {
    if (!confirm('This will clear your browser data but keep your account data on our servers. Continue?')) {
      return;
    }

    try {
      // Clear browser storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear indexedDB if used
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases();
        databases.forEach(db => {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        });
      }

      alert('✅ Browser data cleared successfully.');
      window.location.reload();
      
    } catch (error) {
      console.error('Failed to clear local data:', error);
      alert('❌ Failed to clear browser data.');
    }
  };

  if (!session) {
    return (
      <div className="privacy-section">
        <div className="auth-required-content">
          <h3>🔒 Sign In Required</h3>
          <p>Sign in to access privacy settings and data management.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="privacy-loading">
        <p>Loading privacy settings...</p>
      </div>
    );
  }

  return (
    <div className="privacy-sections">
      <div className="privacy-header">
        <h2>🛡️ Privacy &amp; Security Dashboard</h2>
        <p className="section-description">
          Manage your data, privacy settings, and security preferences
        </p>
      </div>

      <div className="privacy-card">
        <h3>🔒 Security Features</h3>
        <div className="security-features">
          {securityFeatures.map((feature, index) => (
            <div key={index} className="security-item">
              <div className={`security-status ${feature.active ? 'active' : ''}`}>
                {feature.active ? '✓' : '○'}
              </div>
              <div className="security-info">
                <strong>{feature.title}</strong>
                <p>{feature.description}</p>
                {feature.title.includes('OAuth') && session && (
                  <small>Signed in as: {session.user.email}</small>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="privacy-card">
        <h3>📊 Data Collection Preferences</h3>
        <div className="privacy-settings">
          {privacySettings.map((setting) => (
            <div key={setting.key} className="privacy-setting">
              <div className="setting-info">
                <strong>{setting.title}</strong>
                <p>{setting.description}</p>
              
                <label className={`privacy-label ${setting.required ? 'required' : ''}`}>
                  <input
                    type="checkbox"
                    checked={preferences[setting.key] || setting.required}
                    onChange={(e) => updatePreference(setting.key, e.target.checked)}
                    disabled={setting.required}
                    className="privacy-checkbox"
                  />
                  {setting.required ? 'Required' : 'Optional'}
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="privacy-card">
        <h3>🗂️ Data Management</h3>
        <div className="data-actions">
          <button className="btn btn--outline" onClick={handleExportData}>
            📁 Export My Data
          </button>
          <button className="btn btn--outline" onClick={resetToDefaults}>
            🔄 Reset Preferences
          </button>
          <button className="btn btn--outline danger" onClick={handleDeleteAllData}>
            🗑️ Delete All Data
          </button>
        </div>
        
        <div className="data-info">
          <p><strong>Note:</strong> All your data is stored locally in your browser. Nothing is sent to our servers except for YouTube search requests.</p>
        </div>
      </div>
    </div>
  );
}
