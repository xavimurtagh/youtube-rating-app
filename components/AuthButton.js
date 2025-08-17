import { useSession, signIn, signOut } from 'next-auth/react';

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="btn btn--secondary">Loading...</div>;
  }

  if (session) {
    return (
      <div className="user-profile">
        <div className="user-info">
          {session.user.image && (
            <img
              src={session.user.image}
              alt={session.user.name}
              className="user-avatar"
            />
          )}
          <div className="user-details">
            <div className="user-name">{session.user.name}</div>
            <div className="user-email">{session.user.email}</div>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="btn btn--outline btn--sm"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="auth-section">
      <button
        onClick={() => signIn('google')}
        className="btn btn--primary"
      >
        🔐 Sign in with Google
      </button>
      <p className="auth-note">
        Sign in to sync your ratings and access YouTube features
      </p>
    </div>
  );
}
