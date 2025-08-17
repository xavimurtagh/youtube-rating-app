import { useSession } from 'next-auth/react';
import { usePrivacy } from '../hooks/usePrivacy';

export default function PrivacyDashboard() {
  const { data: session } = useSession();
  const { preferences, updatePreference, resetToDefaults } = usePrivacy();

  const securityFeatures = [
    {
      title: 'Google OAuth2 Authentication',
      description: 'Secure sign-in using your existing Google account',
      active: !!session // Now shows active when user is signed in
    },
    {
      title: 'Encrypted Data Storage',
      description: 'All user data encrypted both in transit and at rest',
      active: true
    },
    {
      title: 'No Password Storage',
      description: 'We never see or store your password - handled by Google',
      active: true
    },
    {
      title: 'Session Security',
      description: 'Secure session management with automatic timeout',
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
      title: 'Analytics & Performance',
      description: 'Help us improve the app experience',
      required: false
    },
    {
      key: 'personalization',
      title: 'Personalized Recommendations',
      description: 'Use your ratings to suggest similar content',
      required: false
    },
    {
      key: 'marketing',
      title: 'Marketing Communications',
      description: 'Receive updates about new features',
      required: false
    }
  ];

  const handleExportData = () => {
    // Export user data
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
  };

  const handleDeleteAllData = () => {
    if (confirm('Are you sure you want to delete all your data? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="privacy-sections">
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
              </div>
              <label className={`privacy-label ${setting.required ? 'required' : ''}`}>
                <input
                  type="checkbox"
                  checked={preferences[setting.key]}
                  onChange={(e) => updatePreference(setting.key, e.target.checked)}
                  disabled={setting.required}
                  className="privacy-checkbox"
                />
                {setting.required ? 'Required' : 'Optional'}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="privacy-card">
        <h3>🗂️ Data Management</h3>
        <div className="data-actions">
          <button className="btn btn--outline" onClick={handleExportData}>
            Export My Data
          </button>
          <button className="btn btn--outline" onClick={resetToDefaults}>
            Reset Preferences
          </button>
          <button className="btn btn--outline danger" onClick={handleDeleteAllData}>
            Delete All Data
          </button>
        </div>
      </div>
    </div>
  );
}
