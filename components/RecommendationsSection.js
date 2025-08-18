export default function RecommendationsSection() {
  return (
    <div className="recommendations-placeholder">
      <div className="placeholder-content">
        <h2>🤖 AI-Powered Recommendations COMING SOON!</h2>
        <p>Our collaborative filtering algorithm will be able to recommend videos.</p>

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

      </div>
    </div>
  );
}
