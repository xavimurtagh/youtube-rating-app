# YouTube API: how we use it, and getting more quota

This is the reference for the YouTube API quota and compliance audit. It covers what we call, what we store, how we follow the rules, and the arithmetic behind a quota request. Keep it in step with the code: the audit checks the live app against what you tell it.

## Quota as it stands (checked November 2026)

Since 1 June 2026, YouTube Data API quota comes in separate buckets. Each one resets at midnight Pacific time.

| Bucket | Default | What we use it for |
| --- | --- | --- |
| `search.list` | 100 calls a day (1 per call) | Members searching for a video |
| General | 10,000 units a day | `videos.list`: 1 unit per call, up to 50 ids |

Check the project's real limits on the Google Cloud Console's Quotas page. Some of Google's pages still show the old cost of 100 units per search.

The only way to raise either bucket is the **YouTube API Services audit and quota extension form**: <https://support.google.com/youtube/contact/yt_api_form> (guide: <https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits>). Google publishes no timeline. Developers report anything from a few weeks to a few months, and some reviews go quiet for weeks. Apply well before you need the quota.

## What we call

| Call | Where | Parts | Cost |
| --- | --- | --- | --- |
| `videos.list` | `pages/api/video-details.js` (watch page), `pages/api/cron/refresh-videos.ts` (daily refresh) | `snippet`, `contentDetails`, `status` | 1 unit per 50 ids |
| `search.list` | `pages/api/youtube/search.ts` | `snippet` | 1 search call |

We never request `statistics`, never use OAuth scopes for YouTube, and never read anyone's YouTube account. Sign-in is Google with `openid email profile` only.

## Staying inside the defaults until quota is granted

- **Search** (`pages/api/youtube/search.ts`):
  - signed-in members only, with 30 searches per person per hour;
  - repeat queries are answered from a 24-hour cache (`SearchCache`);
  - once the day's budget is spent (`YOUTUBE_SEARCH_DAILY_CALLS`, default 90) it stops calling YouTube and says so;
  - videos already rated here are always shown first, at no cost;
  - pasting a YouTube link opens the video without any search.
- **Video details**:
  - one batched call per page view;
  - limited to 60 per minute per IP;
  - Takeout imports are parsed in the browser and make no API calls.

## Compliance map

| Requirement (YouTube API Services Terms and Developer Policies) | Where it's met |
| --- | --- |
| No "YouTube", "YT" or similar in the app's name, logo or domain | `lib/brand.js` (working name). **Domain: still to do.** |
| Say we work with YouTube, without implying endorsement | Footer disclaimer, `BRAND.disclaimer` |
| Link to the YouTube Terms of Service; users agree to be bound by them | `/terms`, plus the consent line under every sign-in button (`Consent` in `components/Layout.js`) |
| Privacy policy: shown prominently, says we use YouTube API Services, links to the Google Privacy Policy, explains collection, sharing, cookies and contact | `/privacy`, linked in the footer of every page |
| Users agree to the privacy policy before use | Consent line under the sign-in buttons |
| Stored API data is refreshed or deleted within 30 days | Daily cron `pages/api/cron/refresh-videos.ts` (refreshes after 25 days, strips data from removed videos); each watch-page lookup also counts as a refresh; search cache kept for 1 day; the feed reads titles from the refreshed `Video` table |
| No derived metrics from API data | No views or likes are fetched, stored or shown. All scores come from members' 1–10 ratings and are labelled "from N ratings here" |
| Our own metrics are disclosed as ours | `/how-it-works` and `/terms`: "Every score … comes from members' ratings" |
| Embedded player: at least 200×200, unmodified, no overlays, Referer sent | `components/Player.js` (IFrame API, full-width 16:9, privacy-enhanced host, no overlays); `Referrer-Policy: strict-origin-when-cross-origin` in `vercel.json` |
| No incentives for watching, liking or subscribing | No streaks, badges or rewards for watching. Keep it that way (also any future leaderboards: reward taste, not volume) |
| Users can delete their data | Settings → Delete everything (deletes the account, ratings, follows, favourites, activity) |

## Before you apply

1. **Name and domain.** Settle the final name and put the app on its own domain, without "youtube". Set `NEXTAUTH_URL` to it.
2. **Environment** (Vercel): set `NEXT_PUBLIC_CONTACT_EMAIL` (shown on the privacy and terms pages) and `CRON_SECRET` (the daily refresh job won't run without it).
3. **Database:** run `npx prisma db push` so `refreshedAt`, `available` and `SearchCache` exist.
4. **Google OAuth consent screen:**
   - set it to *In production*, so reviewers can sign in with any Google account;
   - enter the app name, homepage, privacy policy and terms URLs, all on the verified domain;
   - ask for brand verification (about 2–3 business days).
5. **Evidence:**
   - Screenshots of the landing page, Today, a watch page with the player, search results, the privacy and terms pages, and Settings showing data deletion.
   - A short screencast of the flow: sign in, search, watch, rate.
6. **Inbox:** watch the contact inbox. Audit emails that go unanswered can lead to quota being cut.

## Draft answers for the form

**API client is publicly accessible?** Yes. Anyone with a Google account can sign in at the homepage. No demo account is needed.

**How we use YouTube API Services today:**

> [Name] is a social rating site for YouTube videos. Members rate videos they've watched from 1 to 10, follow friends, and get a few personal picks a day. Each pick comes with a plain-language reason based on members' own ratings (for example, "Sam, your 82% taste match, gave it a 9").
>
> Videos play in the YouTube embedded player, unmodified, with no overlays, using the IFrame API in privacy-enhanced mode. We call two endpoints:
> - videos.list (snippet, contentDetails, status): to show a video's title, channel, length and category on its page, and to check that it can be embedded.
> - search.list (snippet): when a member searches for a video to rate.
>
> We store the video ID, title, channel name, thumbnail URL and category alongside members' ratings. We refresh them at least every 25 days, and we strip YouTube data from videos that are no longer available. Search results are cached for 24 hours.
>
> We don't request statistics, don't build metrics from YouTube data, and don't access members' YouTube accounts. Every score shown comes from members' own ratings and is labelled that way. Users agree to the YouTube Terms of Service when they sign in. Our privacy policy is at [domain]/privacy and our terms are at [domain]/terms.

**Quota requested, with arithmetic.** These figures are a template. Replace them with real usage from the Cloud Console once there is some.

- **search.list:**
  - Expected daily active members in 3–6 months: 2,000.
  - At 2 searches each: 4,000 searches a day.
  - About 35% are answered from our cache or from videos already rated here, leaving about 2,600 calls a day.
  - Peak hour is about 12% of the day: about 310 calls an hour, or 0.09 calls a second.
  - **Request 3,000 search.list calls a day.**
- **General bucket (videos.list):**
  - Watch-page lookups: 2,000 members × 4 videos × 1 unit = 8,000 units.
  - Daily refresh: up to 1,000 videos ÷ 50 = 20 units.
  - Allow headroom for growth and retries.
  - **Request 25,000 units a day.**
- **If refused:** keep running on the defaults with the current safeguards. Search falls back to the cache and to videos already rated here, and pasted links always work.
