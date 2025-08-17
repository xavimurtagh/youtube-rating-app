import '../styles/globals.css'
import { SessionProvider } from 'next-auth/react'

export default function App({
  Component,
  pageProps: { session, ...pageProps }
}) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  )
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
