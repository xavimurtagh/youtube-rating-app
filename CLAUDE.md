# CLAUDE.md

This is the context for Claude sessions working on this repo.
- Before any UI work, read `docs/DESIGN.md`.
- Before touching anything that calls YouTube or stores its data, read `docs/YOUTUBE_API.md`.
- For what's decided and what's next, read `docs/ROADMAP.md`.

## What this is

A social rating site for YouTube videos. The working name is **Matinee**, set in `lib/brand.js`, and it is being replaced (see the roadmap).
- Members rate videos from 1 to 10 and follow friends.
- Each day they get a few picks, each with a plain-language reason, such as "Sam, your 82% taste match, gave it a 9".
- Videos play in YouTube's embedded player inside the app.
- Picks come first; members can then browse as long as they like. More loads only when asked for: no autoplay and no infinite scroll, and every item says why it's there.

## Stack and commands

- **Stack:** Next.js 14 (Pages Router), React 18, NextAuth v4 (Google, JWT sessions), Prisma 6 with Postgres, next-themes, Vitest.
- **Everyday commands:** `npm ci`, `npm run dev`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.
- **Schema changes:** edit `prisma/schema.prisma`, then run `npx prisma db push` (there's no migrations folder) and `npx prisma generate`. Tell the owner whenever a change needs a `db push`.
- **Design review:**
  - Run `npm run dev -- -p 3123`, then `node scripts/screenshots.js 1 all` (or a comma-separated list of scenarios).
  - Every `/api` call is mocked with sample data, and the output goes to `.screenshots/`.
  - Look at the shots before calling UI work done.
- **Icons:** `node scripts/make-icons.js <Letter>` regenerates every icon size and the favicon.
- **Claude's cloud sandbox:** the Prisma engine download is blocked there.
  - Install with `npm ci --ignore-scripts`.
  - Then run `npx prisma generate --no-engine`. It builds the client's types without the engine, so `npm run typecheck` and `npx next build` check the real database types, as CI does.

## Map

- `pages/`:
  - `index`: shows the landing page, or Today when signed in.
  - `watch/[id]`, `search`, `people`, `settings`, `how-it-works`, `privacy`, `terms`.
  - `diary`: tabs for rated, history and import.
  - `profile/[id]`: `me` works as the id.
  - `rate`: the bookmarklet popup.
- `pages/api/`:
  - `rate`, `my-ratings`, `recommendations`, `community`, `feed`, `favorites`, `privacy`, `profile/[id]`, `me`.
  - `follow`, `followers`, `following`, `users/search`.
  - `video-details`, `video/[id]/stats`.
  - `youtube/search`: cached and on a budget.
  - `cron/refresh-videos`: the daily refresh that enforces the 30-day rule.
  - `clear-all-data`: deletes the account.
- `components/`:
  - `Layout`: masthead, `LightsToggle`, footer, `Consent`, `SignInPrompt`.
  - `Today`, `Landing`, `Legal`.
  - `Entry`: `FeatureEntry`, `CardEntry`, `RowEntry`, `FriendEntry`.
  - `Player`, `RatingStrip` (with `Meter`), `Score` (with `Histogram`), `Still`, `Avatar`, `Toast`.
- `contexts/LibraryContext.js`: the client's view of your ratings.
  - The database is the source of truth.
  - localStorage holds only the imported Takeout history and a cache.
- `lib/`:
  - `recommend.ts`: user-to-user Pearson with significance weighting, structured `because` reasons, and Bayesian community favourites.
  - `format.js`: `describeReason`, `withArticle` ("an 8"), and dates.
  - `quota.ts`: the search budget and Pacific-day helpers.
  - `videoCache.js`: per-tab video cache and today's pick order.
  - `brand.js`: name, disclaimer, contact.
- `styles/globals.css`: the whole design system, with tokens at the top and both themes. There are no CSS modules and no Tailwind.
- `test/`: Vitest unit tests for the recommender, formatting, quota, Takeout parsing, rate limiting and validation.

## Rules that matter

**Design** (full guide in `docs/DESIGN.md`)
- Use three typefaces: Newsreader, Schibsted Grotesk and IBM Plex Mono.
- Use one accent colour (amber), and hairlines instead of boxes.
- No shadows, gradients or emoji. Use the tokens only, and check both themes.
- Less is more:
  - Give each card one job and at most one number.
  - Don't scatter uppercase labels.
  - Hide what isn't needed until it is: for example, the community score appears after you rate.
- Write copy that's warm, plain and short, the way a person would say it: "Saved. You gave it an 8."

**YouTube** (details in `docs/YOUTUBE_API.md`)
- Never put "YouTube", "YT" or similar in the product name, logo or domain.
- Stored YouTube data must be refreshed or deleted within 30 days.
  - The cron job handles the `Video` table.
  - Don't copy titles or other YouTube data into other tables.
- Don't build derived metrics from YouTube data: no views or likes in scores or rankings.
- Label our scores as members' ratings.
- Never reward watching: no streaks, badges or rewards for views.
- Never gate playback, and never modify or overlay the player.
- Quota:
  - `search.list` has its own bucket of about 100 calls a day.
  - `videos.list` costs 1 unit per 50 ids.
  - Batch calls, cache results, and prefer data we already hold.

**Privacy**
- Enforce the four privacy flags on the server: `discoverable`, `publicProfile`, `showActivity`, `allowRecommendations`.
- Imported Takeout history stays in the browser.
- If what's collected or shared changes, update `/privacy`.

## Working conventions

- Work on the branch the session gives you, and commit with clear messages.
- Don't open pull requests unless asked.
- The repo is public, so keep business strategy and personal details out of it.
- When a decision is made or a roadmap item ships, update `docs/ROADMAP.md`.
