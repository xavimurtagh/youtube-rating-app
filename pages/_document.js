import Document, { Html, Head, Main, NextScript } from 'next/document';
import { BRAND } from '../lib/brand';

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en" suppressHydrationWarning>
        <Head>
          <meta name="theme-color" content="#f3efe7" media="(prefers-color-scheme: light)" />
          <meta name="theme-color" content="#13120f" media="(prefers-color-scheme: dark)" />
          <meta property="og:site_name" content={BRAND.name} />
          <meta property="og:title" content={BRAND.title} />
          <meta property="og:description" content={BRAND.description} />
          <link rel="icon" href="/favicon.ico" sizes="any" />
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
          <link rel="manifest" href="/site.webmanifest" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
