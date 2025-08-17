export default function TabNavigation({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'search', label: 'Search Videos', icon: '🔍' },
    { id: 'import', label: 'Import History', icon: '📁' },
    { id: 'music', label: 'Music & Songs', icon: '🎵' },
    { id: 'ratings', label: 'My Ratings', icon: '⭐' },
    { id: 'stats', label: 'Statistics', icon: '📊' },
    { id: 'privacy', label: 'Privacy', icon: '🛡️' },
    { id: 'recommendations', label: 'AI Recommendations', icon: '🤖' }
  ];

  return (
    <div className="tab-navigation-enhanced">
      <div className="tab-container">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn-enhanced ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
