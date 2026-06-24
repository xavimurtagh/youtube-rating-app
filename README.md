# YouTube Video Rating App

A secure, privacy-focused web application for rating and managing your YouTube watch history using Google Takeout data.

## Features

- 🔍 **Search & Rate Videos**: Search for YouTube videos and rate them
- 📁 **Google Takeout Import**: Import your YouTube watch history from Google Takeout
- ⭐ **Rating System**: Rate videos on a 1-10 scale with visual feedback
- 🛡️ **Privacy Dashboard**: Manage your data and privacy preferences
- 🤖 **AI Recommendations**: Collaborative-filtering recommendations from users with similar taste, with a content/popularity fallback while the community grows
- 👥 **Social**: Follow other users, see their activity, and compare ratings
- 🎨 **Modern Design**: Clean, responsive interface with dark/light mode support
- ☁️ **Synced Account Data**: Your ratings, favorites, and follows are stored in a database tied to your Google account so they sync across devices

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd youtube-rating-app
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect it's a Next.js app
3. Deploy with default settings

### Manual Deployment

```bash
npm run build
npm run start
```

## Using Google Takeout

1. Go to [Google Takeout](https://takeout.google.com)
2. Select "YouTube and YouTube Music"
3. Choose "history" in the YouTube data options
4. Select JSON format
5. Download your archive
6. Extract and upload the "watch-history.json" file to the app

## Project Structure

```
youtube-rating-app/
├── components/          # React components
├── hooks/              # Custom React hooks
├── pages/              # Next.js pages
├── pages/api/          # API routes
├── public/             # Static assets
├── styles/             # CSS styles
├── utils/              # Utility functions
├── next.config.js      # Next.js configuration
├── package.json        # Dependencies and scripts
└── vercel.json         # Vercel deployment config
```

## Privacy & Security

- Sign-in uses Google OAuth — the app never sees or stores your password
- Your **imported Google Takeout watch history is processed in your browser** and is not uploaded
- **Account data you create — ratings, favorites, and follows — is stored server-side** in a PostgreSQL database, tied to your Google account, so it can sync across devices and power the social and recommendation features
- You can export your local data or permanently delete your server-side data at any time from the Privacy Dashboard
- Security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy) are configured in `vercel.json`

### Environment variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (Prisma) |
| `NEXTAUTH_SECRET` | Secret used to encrypt NextAuth session tokens |
| `NEXTAUTH_URL` | Base URL of the app (e.g. `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `YOUTUBE_API_KEY` | Server-side YouTube Data API key (used for search) |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the MIT License.
