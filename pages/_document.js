import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="description" content="YouTube Video Rating App - Rate and manage your YouTube watch history securely" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body>
        <div className="security-banner">
          <div className="container">
            <div className="security-info">
              <span className="security-icon">🛡️</span>
              All data is stored locally and encrypted for your privacy
            </div>
          </div>
        </div>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
