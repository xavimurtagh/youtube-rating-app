export default function RecommendationsSection() {
  return (
    <div className="recommendations-placeholder">
      <div className="placeholder-content">
        <h2>🤖 AI-Powered Recommendations</h2>
        <p>Our collaborative filtering algorithm will recommend videos based on users with similar preferences.</p>

        <div className="feature-list">
          <div className="feature-item">
            <div className="feature-icon">🎯</div>
            <div>
              <h4>Personalized Suggestions</h4>
              <p>Videos tailored to your taste based on your rating history</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-icon">👥</div>
            <div>
              <h4>Similar User Discovery</h4>
              <p>Find users with similar preferences and discover their favorites</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-icon">📈</div>
            <div>
              <h4>Trend Analysis</h4>
              <p>Discover trending content in your preferred categories</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-icon">🔒</div>
            <div>
              <h4>Privacy Preserved</h4>
              <p>Recommendations without compromising your personal data</p>
            </div>
          </div>
        </div>

        <div className="coming-soon">
          <p><em>AI recommendations will be available once you have rated at least 10 videos.</em></p>
        </div>
      </div>
    </div>
  );
}
