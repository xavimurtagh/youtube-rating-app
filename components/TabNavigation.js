export default function TabNavigation({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'search', label: '🔍 Search', icon: '🔍' },
    { id: 'import', label: '📁 Import', icon: '📁' },
    { id: 'ratings', label: '⭐ Ratings', icon: '⭐' },
    { id: 'privacy', label: '🛡️ Privacy', icon: '🛡️' },
    { id: 'recommendations', label: '🤖 AI Recs', icon: '🤖' }
  ];

  return (
    <div className="tab-navigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <span>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
