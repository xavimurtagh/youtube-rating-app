import { usePrivacy } from '../hooks/usePrivacy';

export default function PrivacyDashboard() {
  const { preferences, updatePreference, resetToDefaults } = usePrivacy();

  const securityFeatures = [
    {
      title: 'Google OAuth2 Authentication',
      description: 'Secure sign-in using your existing Google account',
      active: false // This would be true when OAuth is implemented
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
          <button className="btn btn--outline">
            Export My Data
          </button>
          <button className="btn btn--outline danger" onClick={resetToDefaults}>
            Reset Preferences
          </button>
          <button className="btn btn--outline danger">
            Delete All Data
          </button>
        </div>
      </div>
    </div>
  );
}
