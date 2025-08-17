import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function AuthError() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    if (router.query.error) {
      setError(router.query.error);
    }
  }, [router.query.error]);

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'Configuration':
        return 'There is a problem with the server configuration.';
      case 'AccessDenied':
        return 'Access was denied. You may have cancelled the login process.';
      case 'Verification':
        return 'The verification token has expired or has already been used.';
      default:
        return 'An unknown error occurred during authentication.';
    }
  };

  return (
    <>
      <Head>
        <title>Authentication Error - YouTube Rating App</title>
      </Head>
      
      <div className="container">
        <div className="auth-error-page">
          <div className="error-content">
            <div className="error-icon">⚠️</div>
            <h1>Authentication Error</h1>
            <p className="error-message">{getErrorMessage(error)}</p>
            
            <div className="error-actions">
              <Link href="/" className="btn btn--primary">
                Return Home
              </Link>
              <button 
                onClick={() => router.back()} 
                className="btn btn--secondary"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .auth-error-page {
          min-height: 80vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .error-content {
          text-align: center;
          max-width: 500px;
          padding: var(--space-32);
        }
        
        .error-icon {
          font-size: 4rem;
          margin-bottom: var(--space-24);
        }
        
        .error-message {
          margin: var(--space-16) 0 var(--space-32) 0;
          color: var(--color-text-secondary);
        }
        
        .error-actions {
          display: flex;
          gap: var(--space-16);
          justify-content: center;
          flex-wrap: wrap;
        }
      `}</style>
    </>
  );
}
