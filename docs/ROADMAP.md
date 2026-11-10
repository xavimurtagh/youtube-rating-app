# Roadmap

This file records what's decided and what's next, so any session can pick up from here. When something ships or a decision changes, update it.

## Decided

- **Ratings stay at 1–10.** There's no pairwise "which did you like more?": members decide what they like on the scale. To help ratings stay consistent, we may show your own past scores as anchors ("you gave X a 9"). (Nov 2026)
- **Picks first, then browse freely.** (Nov 2026; replaces "picks, not a feed")
  - Today opens with the day's best picks for you, each with its reason.
  - Members can keep going as long as they like: shelves by length, mood, type and friends, plus Explore, rankings and search.
  - More loads when you ask for it ("Show more"). There's no infinite scroll and no autoplay, and every item still says why it's there.
- **Open to everyone.** There's no invite-only launch or waitlist. The tone is community and collaboration: anyone can nominate, make lists and write reviews. (Nov 2026)
- **Reward taste, never volume.** Counts may appear on a profile as plain facts, but there are no badges, levels, streaks or leaderboards for how much you watch or rate. Recognition comes from others valuing your judgement, for example "Your 9s were loved by 23 people". (Nov 2026)
- **Yes to:**
  - "Our guess", then the reveal;
  - Saved, from anywhere;
  - moods and length filters;
  - taste-match invites;
  - share cards;
  - a yearly recap;
  - categories with rankings. (Nov 2026)
- **Name: "Match" and "Matinee" are both out.**
  - Match Group enforces MATCH hard. Muzmatch lost in the UK courts and became Muzz.
  - "Matinee: Movie & TV Tracker" already exists in our category.
  - "Matinee" stays as the working name until a new one is chosen.
- **The community score is hidden until you rate**, so the crowd doesn't anchor your score. Signed-out visitors see it.
- **Theme:** a "Lights down / Lights up" switch in the masthead, and Auto in Settings.
- **Quota:** apply early, and stay inside the default allowances until it's granted. See `docs/YOUTUBE_API.md`.

## Now

1. **Name.** The owner decides. To rename:
   1. Change `lib/brand.js`, `public/site.webmanifest`, the README and the docs.
   2. Run `node scripts/make-icons.js <Letter>`.
   3. Change the domain and the Google consent screen.
2. **Polls.** Nominations open on 1 December. See below.
3. **Security hardening** from the November review (tracked privately), then the quota application.

### Polls

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
3. **Results, mid-January.** Ranked by Bayesian average (prior weight about 5, minimum about 5 ratings), with runners-up, on a public, shareable results page.

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
- Admins are set by an `ADMIN_EMAILS` env var.

**Pages:**
- `/polls`
- `/polls/[slug]`: nominate, and the ballot with an inline `RatingStrip`.
- `/polls/[slug]/results`: public, server-rendered, with an Open Graph image.

**Also on this model:** an automatic monthly chart (no ballot), and themed one-off polls.

## Next

### Saved: watch later, from anywhere

- **How to save:**
  - a Save button on every video, everywhere;
  - paste a link;
  - share a YouTube link from your phone (Android `share_target` in the manifest; on iOS, a share extension once there's an app);
  - a browser extension button on youtube.com.
- **Model:** `SavedVideo(userId, videoId, savedAt, source)`. Durations come from `videos.list` `contentDetails` and are refreshed under the 30-day rule.
- **Sort and filter:** by length, mood, type, topic and date saved. Seeing a friend save it too ("Sam saved this too"), and "You both want to watch" on a friend's profile.

### "Got 20 minutes?" and other filters

One filter bar, used on Today's shelves, Saved, Diary, Explore and rankings:
- **Length:** under 10 minutes, 10–20, 20–45, 45 and over, or "fits in N minutes".
- **Mood:** calming, funny, mind-blowing, moving, cosy, intense. These come from members' one-tap tags after rating, shown as a crowd split ("mostly calming").
- **Type:** video essay, documentary, explainer, live performance, interview or podcast, short film, tutorial.
- **Topic:** philosophy, film, history, science, maths, travel, food, music, technology, art and design, nature, politics.
- Type and topic come from member tags plus channel defaults.

### The video page, in order

1. The player.
2. Title, channel (opens its page here), length and year.
3. Rate, with "Our guess: 8" beforehand and "We guessed 8. You gave it 9." afterwards.
4. Save and Share.
5. The reason it's on your list, if it came from your picks.
6. After you rate:
   - the community score and spread;
   - the mood tap;
   - an optional short review.
7. Friends who rated it.
8. Reviews, from people with taste like yours first.
9. Lists it's in, and rankings it appears in ("#4 Video essays, 2026").
10. More from this channel.
11. "People who loved this also loved".
12. Next: your next pick, or a choice of three. Never autoplay.

### Other pages

- **Channel:** best-rated videos, members' average across the channel, your ratings, rated by people like you, and the creator's guest programme.
- **Profile:** four favourites, taste match, recent ratings, lists, reviews and the yearly recap.
- **List:** items with notes and the total running time; Save list.
- **Category ranking:** all-time, this year or this month, with the minimum-ratings rule explained. Each entry shows its score and number of ratings.

### Our guess, then the reveal

- Show the predicted rating only when we're confident: enough similar members have rated it.
- Afterwards, show how close we were.
- The profile shows running accuracy ("within one point 74% of the time").

### Categories and rankings

- Rankings per type and per topic (Top 100 video essays, best travel videos of 2026, under the radar).
- Each uses a Bayesian average with a minimum number of ratings, labelled as members' ratings.
- Creators' own ratings are excluded, and rating bursts are flagged.

### Yearly recap

1. **Your year here:** built from ratings and saves in the app. It costs nothing to make and is ready on 1 December.
2. **Your whole YouTube year:**
   - one guided Takeout link, then drop the zip in;
   - it's read in the browser, so nothing is uploaded;
   - durations come from cached `videos.list` calls.
3. **One tap, where Google allows it:** Google's Data Portability API (check its regions and verification cost first).
4. **Sharing:** story-sized cards, plus a public community year-end list.

### Taste-match invites and share cards

- **Invite:** a link asking "How similar is our taste?" A friend rates up to 10 of your rated videos and sees the match, where you agree and where you differ, then can follow you.
- **Share cards:** proper link previews (Open Graph images) for profiles, videos, lists and polls, plus story-sized cards for ratings, taste match, ballots and the recap.
- **Public pages:** profiles (when public), videos, lists and polls render on the server without sign-in.

### Platforms

1. Web app now, installable as a PWA, with Android share-to-save.
2. A browser extension at about 1,000 members (Chrome, Edge, Firefox, Safari): rate, save and see members' score on youtube.com, beside the player, never over it.
3. Native iOS and Android once retention holds. The first reasons for native apps are the iOS share extension (save or rate from the YouTube app) and a "today's pick" widget.

## Later

- Short reviews and member lists, with moderation tools (report, block).
- "Best moment" timestamps: members pin the moment that made a video, and long videos get a "start here" hint.
- Following channels inside the app, to get their best-rated new uploads rather than every upload.
- A weekly email of your picks.
- Credit for taste: "your 9s were loved by 23 people", and early-pick credit based on members' ratings.
- A paid tier for extra features (deeper stats, more filters). Never charge for playback.

## Not doing

- Pairwise ranking.
- An invite-only or waitlist launch.
- Streaks, badges, levels or leaderboards for watching or rating volume. YouTube's policies forbid incentives to watch, and it's against the product's aim.
- Scores or rankings built from YouTube views or likes.
- Autoplay, or infinite scroll.
