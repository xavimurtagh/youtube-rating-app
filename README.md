# YouTube Video Rating App

A secure, privacy-focused web application for rating and managing your YouTube watch history using Google Takeout data.

## Features

- 🔍 **Search & Rate Videos**: Search for YouTube videos and rate them
- 📁 **Google Takeout Import**: Import your YouTube watch history from Google Takeout
- ⭐ **Rating System**: Rate videos on a 1-10 scale with visual feedback
- 🛡️ **Privacy Dashboard**: Manage your data and privacy preferences
- 🤖 **AI Recommendations**: Get personalized recommendations based on your ratings (coming soon)
- 🎨 **Modern Design**: Clean, responsive interface with dark/light mode support
- 🔒 **Local Storage**: All data stored locally in your browser for maximum privacy

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

- All data is stored locally in your browser
- No data is sent to external servers
- Google Takeout files are processed client-side only
- Optional privacy controls for analytics and features
- Secure headers and content security policies

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the MIT License.
