import { signIn } from 'next-auth/react';

export default function SignInModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const handleSignIn = () => {
    signIn('google');
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal" onClick={handleOverlayClick}>
      <div className="modal-content">
        <button onClick={onClose} className="modal-close-top">×</button>
        
        <div className="modal-header">
          <h3>Sign In Required</h3>
        </div>
        
        <div className="modal-body">
          <div className="auth-required-content">
            <div className="auth-icon">🔐</div>
            <h4>Sign in to rate videos</h4>
            <p>You need to sign in with your Google account to rate videos and save your preferences.</p>
            
            <div className="auth-benefits">
              <h5>Benefits of signing in:</h5>
              <ul>
                <li>✅ Save your video ratings</li>
                <li>✅ Sync across devices</li>
                <li>✅ Get personalized recommendations</li>
                <li>✅ Access YouTube features</li>
                <li>✅ View detailed statistics</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn--secondary">
            Cancel
          </button>
          <button onClick={handleSignIn} className="btn btn--primary">
            🔐 Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}
