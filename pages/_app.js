import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource-variable/schibsted-grotesk/index.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '../styles/globals.css';

import Head from 'next/head';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import Layout from '../components/Layout';
import { ToastProvider } from '../components/Toast';
import { LibraryProvider } from '../contexts/LibraryContext';
import { BRAND } from '../lib/brand';

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  const page = <Component {...pageProps} />;

  return (
    <SessionProvider session={session}>
      <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem themes={['light', 'dark']} disableTransitionOnChange>
        <ToastProvider>
          <LibraryProvider>
            <Head>
              <title>{BRAND.title}</title>
              <meta name="description" content={BRAND.description} />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>
            {Component.bare ? page : <Layout>{page}</Layout>}
          </LibraryProvider>
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
