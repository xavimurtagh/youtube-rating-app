import '../styles/globals.css'
import { SessionProvider } from 'next-auth/react'
import React, { useEffect, useState } from 'react';

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
    <SessionProvider session={session}>
      <ThemeProvider
        attribute="data-theme"
        themes={['light', 'dark']}
        defaultTheme="system"
        enableSystem
      >
        <Component {...pageProps} />
      </ThemeProvider>
    </SessionProvider>
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

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import styles from '../styles/ThemeToggle.module.css';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={styles.themeToggle}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
