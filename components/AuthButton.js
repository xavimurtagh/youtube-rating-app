import { useSession, signIn, signOut } from 'next-auth/react';

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="auth-button loading">
        <span className="loading-text">Loading...</span>
      </div>
    );
  }

  if (session) {
    return (
      <div className="auth-button signed-in">
        <div className="user-info">
          {session.user.image && (
            <img 
              src={session.user.image} 
              alt={session.user.name || 'Profile'} 
              className="user-avatar"
            />
          )}
          <div className="user-details">
            <span className="user-name">{session.user.name}</span>
            <span className="user-email">{session.user.email}</span>
          </div>
        </div>
        <button 
          onClick={() => signOut()} 
          className="btn btn--outline btn--sm sign-out-btn"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="auth-button signed-out">
      <button 
        onClick={() => signIn('google')} 
        className="btn btn--primary sign-in-btn"
      >
        <span className="sign-in-icon">🔐</span>
        Sign In
      </button>
    </div>
  );
}
  
