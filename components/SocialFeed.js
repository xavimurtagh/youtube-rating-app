// components/SocialFeed.js
export default function SocialFeed({ friends }) {
  const [activities, setActivities] = useState([]);
  
  return (
    <div className="social-feed">
      <h2>🎬 Friend Activity</h2>
      {activities.map(activity => (
        <div key={activity.id} className="activity-item">
          <img src={activity.user.avatar} alt={activity.user.name} />
          <div className="activity-content">
            <p>
              <strong>{activity.user.name}</strong> rated 
              <strong>{activity.video.title}</strong> 
              <span className="activity-rating">{activity.rating}/10</span>
            </p>
            <span className="activity-time">{activity.timestamp}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
