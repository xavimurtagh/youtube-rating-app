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
