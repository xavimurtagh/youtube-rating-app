import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

const SETTINGS = [
  {
    key: 'discoverable',
    title: 'Discoverable in search',
    description: 'Let other users find you by name or email in user search.'
  },
  {
    key: 'publicProfile',
    title: 'Public profile',
    description: 'Allow others to view your ratings and favorites on your profile page.'
  },
  {
    key: 'showActivity',
    title: 'Show activity to followers',
    description: 'Let people who follow you see in their feed when you rate a video.'
  },
  {
    key: 'allowRecommendations',
    title: 'Personalized recommendations',
    description: 'Use your ratings to generate your recommendations and to help recommend videos to users with similar taste.'
  }
];

export default function PrivacyDashboard() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/privacy', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setSettings(data);
        }
      } catch (error) {
        console.error('Failed to load privacy settings:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session]);

  const updateSetting = async (key, value) => {
    const previous = settings;
    setSettings(s => ({ ...s, [key]: value })); // optimistic
    setSaving(true);
    try {
      const res = await fetch('/api/privacy', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value })
      });
      if (!res.ok) throw new Error('Failed to save setting');
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      console.error('Failed to update privacy setting:', error);
      setSettings(previous); // revert on failure
      alert('Failed to save privacy setting. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const securityFeatures = [
    {
      title: 'Google OAuth2 Authentication',
      description: 'Secure sign-in using your existing Google account',
      active: !!session
    },
    {
      title: 'Account Data Storage',
      description: 'Your ratings, favorites, and follows are stored securely in our database and tied to your Google account; your imported watch history stays in your browser',
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

  const handleExportData = () => {
    if (typeof window === 'undefined') return;
    try {
      const data = {
        videos: JSON.parse(localStorage.getItem('youtube_rating_videos') || '[]'),
        ratings: JSON.parse(localStorage.getItem('youtube_rating_ratings') || '{}'),
        privacySettings: settings,
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

  const handleClearLocalData = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases();
        databases.forEach(db => {
          if (db.name) indexedDB.deleteDatabase(db.name);
        });
      }
      alert('✅ Browser data cleared successfully.');
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear local data:', error);
      alert('❌ Failed to clear browser data.');
    }
  };

  const handleDeleteAllData = async () => {
    if (!confirm('⚠️ This will permanently delete your video data including ratings and favorites')) {
      return;
    }
    const confirmText = window.prompt('Type "DELETE" to confirm you want to delete all your data:');
    if (confirmText?.toUpperCase() !== 'DELETE') {
      alert('Deletion cancelled.');
      return;
    }
    try {
      const response = await fetch('/api/clear-all-data', {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to clear database data');
      }
      localStorage.clear();
      sessionStorage.clear();
      await handleClearLocalData();
    } catch (error) {
      console.error('Failed to clear data:', error);
      alert(`❌ Failed to clear all data: ${error.message}`);
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
        <h3>📊 Privacy Settings</h3>
        <p className="section-description">
          These controls are enforced on our servers. {saving && <em>Saving…</em>}
        </p>
        <div className="privacy-settings">
          {SETTINGS.map(setting => (
            <div key={setting.key} className="privacy-setting">
              <div className="setting-info">
                <strong>{setting.title}</strong>
                <p>{setting.description}</p>
                <label className="privacy-label">
                  <input
                    type="checkbox"
                    checked={!!settings?.[setting.key]}
                    onChange={(e) => updateSetting(setting.key, e.target.checked)}
                    className="privacy-checkbox"
                  />
                  {settings?.[setting.key] ? 'On' : 'Off'}
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
          <button className="btn btn--outline danger" onClick={handleDeleteAllData}>
            🗑️ Delete All Data
          </button>
        </div>

        <div className="data-info">
          <p><strong>Note:</strong> Your ratings, favorites, and follows are stored in our database so they sync across devices and power social and recommendation features. Your imported Google Takeout watch history is processed in your browser and is not uploaded. &quot;Delete All Data&quot; removes your server-side data and clears this browser.</p>
        </div>
      </div>
    </div>
  );
}
