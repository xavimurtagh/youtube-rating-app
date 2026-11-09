# Matinee

Videos worth your time, and the reasons why. Rate what you watch on YouTube, see
what your friends are loving, and get a few picks a day from people with taste
like yours, each with a plain-language reason. Videos play inside the app
through YouTube's official embedded player.

> "Matinee" is a working name, set in `lib/brand.js`, and is being replaced (see
> `docs/ROADMAP.md`). YouTube's branding guidelines don't allow "YouTube" or "YT"
> in an app's name or domain, though an app may say it works with YouTube.

Docs: [design guide](docs/DESIGN.md) · [YouTube API use and quota](docs/YOUTUBE_API.md) ·
[roadmap](docs/ROADMAP.md) · [notes for Claude sessions](CLAUDE.md)

## What's in it

- **Today** — a finite daily programme: a main feature, "Also showing", and the
  rest of the bill, each with its reason. Below ten ratings it becomes a
  cold-start page: rate from your watch history (most-rewatched first) and
  browse community favourites.
- **The screening room** (`/watch/[id]`) — YouTube's unmodified player, your
  rating, the community's score and spread, and why the video was picked. When a
  video ends, the rating prompt appears beside the player, never over it.
- **Diary** — everything you've rated by date or by score; rate your imported
  history; import Google Takeout (read in the browser, never uploaded).
- **People and profiles** — follow people, see their favourites and rating
  spread, and your taste match with them.
- **Settings** — privacy controls enforced server-side, theme, export, delete.
- **How it works** — the recommendation method, stated plainly.

## Design system

One stylesheet (`styles/globals.css`). Newsreader for voice, Schibsted Grotesk
for interface, IBM Plex Mono for figures, all self-hosted. Warm paper and ink
with a dark "screening room" mode, one accent (projector amber) reserved for
ratings and focus, hairlines instead of boxes, and no shadows, gradients or
emoji. The rating control is a strip of ten film-sprocket marks.

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
```

3. Configure environment variables — copy `.env.example` to `.env` and fill in
   the values (see the table under [Privacy & Security](#privacy--security)).

4. Set up the database (PostgreSQL):
```bash
npx prisma generate   # generate the Prisma client
npx prisma db push    # create/update tables to match prisma/schema.prisma
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

> After changing `prisma/schema.prisma`, re-run `npx prisma db push` (this
> project uses `db push` rather than a migrations history).

## Testing

```bash
npm test         # run the Vitest unit tests once
npm run test:watch
npm run typecheck # tsc --noEmit
npm run lint
```

CI (GitHub Actions, `.github/workflows/ci.yml`) runs lint, typecheck, tests and
a production build on every push to `main` and on pull requests.

For design review, `node scripts/screenshots.js 1 all` renders every main
screen with sample data (all API calls are mocked) while `npm run dev -- -p 3123`
is running. Screenshots land in `.screenshots/`.

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add the environment variables below, including `CRON_SECRET`
3. Deploy. `vercel.json` schedules the daily job that refreshes stored YouTube
   data (`/api/cron/refresh-videos`), which YouTube's 30-day rule requires

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
components/   UI: Layout (masthead/footer), Today, Landing, Entry, Still,
              RatingStrip, Score, Player, Avatar, Toast
contexts/     LibraryContext — ratings (DB is the source of truth), imported
              history, the single rating write path
lib/          recommend.ts (pure, tested recommender), validation, rateLimit,
              format (reasons, dates), brand, auth, prisma
pages/        today (/), watch/[id], search, diary, people, profile/[id],
              settings, how-it-works, rate (bookmarklet popup)
pages/api/    rate, recommendations, community, my-ratings, me, profile,
              privacy, feed, follow, favorites, video-details, youtube/search
prisma/       schema.prisma (apply with `npx prisma db push`)
styles/       globals.css — the whole design system
test/         Vitest unit tests
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
| `YOUTUBE_API_KEY` | Server-side YouTube Data API key (video details and search) |
| `CRON_SECRET` | Shared secret for the daily refresh job (Vercel sends it automatically) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Contact address shown on the privacy and terms pages |
| `YOUTUBE_SEARCH_DAILY_CALLS` | Optional. Searches allowed per day across everyone (default 90) |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the MIT License.
