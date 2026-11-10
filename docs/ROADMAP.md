# Roadmap

This file records what's decided and what's next, so any session can pick up from here. When something ships or a decision changes, update it.

## Decided

- **Ratings stay at 1–10.** There's no pairwise "which did you like more?": members decide what they like on the scale. To help ratings stay consistent, we may show your own past scores as anchors ("you gave X a 9"). (Nov 2026)
- **Name: "Match" is out.**
  - Match Group enforces MATCH hard. Muzmatch lost in the UK courts in 2022 (upheld on appeal in 2023) and rebranded as Muzz.
  - Match Group has also beaten "Perfect Match", "Dogmatch", "Match 4 Impact" and "Matchmove".
  - "It's a match" also reads as dating.
- **Name: "Matinee" has to go as well.**
  - "Matinee: Movie & TV Tracker" is already a social watchlist and rating app with friends and a nightly set of picks.
  - Matinée is also a Canadian cigarette brand, and the word is weak as a mark for anything film-related.
  - It stays as the working name until a new one is chosen. See "Name" below.
- **Picks, not a feed.** Today shows five picks (one feature and four cards), what friends rated 8 or higher, and a short ending. More picks are one tap away, behind a link.
- **The community score is hidden until you rate**, so the crowd doesn't anchor your score. Signed-out visitors see it.
- **Theme:** a "Lights down / Lights up" switch in the masthead, and Auto in Settings.
- **Quota:** apply early, and stay inside the default allowances until it's granted. See `docs/YOUTUBE_API.md`.

## Now

### 1. Name (the owner decides; a session can run the search)

Make a long list and filter it against these criteria:
- no "YouTube", "YT" or "match";
- no app with the same or a similar name in the App Store or Google Play in a video, social or rating category;
- no live trademark in classes 9, 41, 42 or 45 (USPTO, EUIPO, UKIPO);
- a usable .com or a clean alternative domain;
- easy to say and spell.

It should suggest the promise: taste, friends, picks that are worth it.

To rename:
1. Change `lib/brand.js`, `public/site.webmanifest`, the README and the docs.
2. Run `node scripts/make-icons.js <Letter>`.
3. Change the OAuth consent screen and the domain.

### 2. Polls

"The [Name] Poll: the best of YouTube in 2026". It's modelled on the Goodreads Choice Awards (categories, nominations, then voting), but every vote is an ordinary 1–10 rating, so the poll also fills the recommender with ratings of the same videos.

**Categories to start with:**
- Video essay
- Live performance
- Explainer (science, maths, technology)
- Documentary and long-form
- Short (under 10 minutes)

**Phases:**
1. **Nominations, 1–14 December.** Members nominate up to 3 videos per category, by pasting a link or picking from videos they rated 8 or higher. A video needs 2 nominations to reach the ballot.
2. **Voting, 15–31 December.** Members rate the nominees from 1 to 10 on the ballot or on the watch page.
   - A rating given earlier counts too: it's the same Rating row.
   - Running results stay hidden to avoid herding.
3. **Results, mid-January.**
   - Ranked by Bayesian average (prior weight about 5, minimum about 5 ratings), with runners-up.
   - Shown on a public, shareable results page.

**Anti-gaming:**
- Ratings from accounts less than 7 days old, or with fewer than 10 ratings, are saved but don't count towards results.
- Rate-limit sign-ups.
- Flag sudden bursts of ratings on one video.

**Model (sketch):**
- `Poll`: slug, title, year, `opensAt`, `votingAt`, `closesAt`, `publishedAt`.
- `PollCategory`: `pollId`, slug, title, blurb, order.
- `PollEntry`: `categoryId`, `videoId`, unique on (category, video).
- `PollNomination`: `userId`, `entryId`, unique on (user, entry).
- Votes are `Rating` rows. Phase comes from the dates.
- Admins are set by an `ADMIN_EMAILS` env var. Create polls with a script or a small admin page.

**Pages:**
- `/polls`: the current poll and past ones.
- `/polls/[slug]`: categories, nominating, and the ballot with an inline `RatingStrip`.
- `/polls/[slug]/results`: public, server-rendered, with an Open Graph image.

**Other polls on the same model:**
- An automatic monthly chart ("Best of November"), computed from ratings with no ballot.
- Themed one-off polls, such as "the best video essay ever made".

### 3. Quota application (owner, with the checklist in `docs/YOUTUBE_API.md`)

## Next

- **Taste-match invites.**
  - On your profile there's a link: "How similar is our taste?"
  - A friend who opens it rates up to 10 of the videos you've rated (well-known ones first).
  - They then see "You and Alex: 78% match", where you agree and where you differ, and an offer to follow each other.
  - It's like Spotify Blend's match score combined with Beli's invite-four-friends onboarding.
- **Share cards and public pages.**
  - Profiles (when public), video pages and poll results render on the server without sign-in, so shared links work and search engines can index them.
  - Each has a proper link preview (an Open Graph image built with `@vercel/og`).
  - Story-sized cards (1080×1920) to download: "My 10s this month", "Alex and me: 82% taste match", "My 2026 ballot".
- **Our guess.**
  - The watch page shows what we predicted you'd give a video ("Our guess: 8"). After you rate: "We guessed 8. You gave it 9."
  - Show our running accuracy, so trust in the picks is earned and visible.
  - Borrowed from Beli's Rec Score and Vivino's "Match for You".
- **Saved.**
  - Save a video for later, see when a friend has saved it too, and "you both want to watch".
  - Save from anywhere by pasting a link, or from the Android share sheet (`share_target` in the manifest). This is the equivalent of Vivino's label scan or Corner's save-from-TikTok.
- **Mood tags after rating** (optional, one tap): funny, calming, mind-blowing, moving, rabbit hole, slow burn.
  - Show the crowd's split ("mostly calming").
  - Add filters for mood and "I have 15 minutes".
  - Borrowed from StoryGraph's mood and pace tags and RYM's descriptors.
- **Year in review** each December, alongside the poll.
- **A house pick of the day:** one shared video everyone can rate and talk about.

## Later

- A browser extension to rate while on youtube.com, replacing the bookmarklet.
- Charts: best of the year, of each category, and "under the radar" (loved by few people here).
- Credit for taste: "your 9s were loved by 23 people". Reward judgement, never volume or watching.
- A paid tier priced near Letterboxd Pro. Never charge for playback.

## Not doing

- Pairwise ranking.
- Streaks, badges or leaderboards for watching. YouTube's policies forbid incentives to watch, and it's against the product's aim.
- Scores or rankings built from YouTube views or likes.
- Autoplay, or an endless feed.
