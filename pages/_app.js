import '../styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import { ThemeProvider } from 'next-themes';

export default function App({
  Component,
  pageProps: { session, ...pageProps }
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; 
  }

  return (
    <ThemeProvider 
      attribute="data-theme" 
      defaultTheme="light" 
      enableSystem={false}
      themes={['light', 'dark']}
    >
      <SessionProvider session={session}>
        <Component {...pageProps} />
      </SessionProvider>
    </ThemeProvider>
  );
}

import { signIn, signOut, useSession } from 'next-auth/react';

function Header() {
  const { data: session } = useSession();
  return (
    <div className="header">
      {/* other nav/tabs here */}
      <div className="auth-buttons">
        {session ? (
          <button onClick={() => signOut()}>Sign Out</button>
        ) : (
          <button onClick={() => signIn()}>Sign In</button>
        )}
      </div>
    </div>
  );
}

// Tabs component
function Tabs({ activeTab, setActiveTab }) {
  const tabs = ['Search', 'Ratings', 'Music', 'Statistics'];
  return (
    <div className="tab-container">
      {tabs.map((tab) => (
        <button
          key={tab}
          className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
          onClick={() => setActiveTab(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
