// Design-review screenshots: renders the app with realistic sample data, with
// every /api call answered in the browser, so no database or API keys are
// needed. YouTube's image and player hosts are replaced with stand-ins.
//
//   npm run dev -- -p 3123              (in one terminal)
//   node scripts/screenshots.js 1 all   (DSF 1 for review, 2 for sharing)
//   node scripts/screenshots.js 1 today-light,watch-dark
//
// Env: SHOTS_BASE (default http://localhost:3123), SHOTS_DIR (default
// .screenshots/), STANDINS_DIR (optional folder of photos to use as stills;
// without it, stills are flat placeholder tones), SHOTS_FULL=1 (capture
// phone-sized scenarios full-length too, not just the first screen).
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.SHOTS_DIR || path.join(ROOT, '.screenshots');
const SRC = process.env.STANDINS_DIR || null;
const BASE = process.env.SHOTS_BASE || 'http://localhost:3123';
fs.mkdirSync(OUT, { recursive: true });

const DSF = Number(process.argv[2] || 1);
const WANT = (process.argv[3] || 'all').split(',');

// ---------- sample content ----------
const V = {
  kurosawa001: ['Akira Kurosawa — Composing Movement', 'Every Frame a Painting', 'Film & Animation', 'PT8M31S', '2015-03-20'],
  theegg00001: ['The Egg — A Short Story', 'Kurzgesagt – In a Nutshell', 'Education', 'PT7M54S', '2019-09-15'],
  tinydesk001: ['Mac Miller: Tiny Desk Concert', 'NPR Music', 'Music', 'PT16M2S', '2018-08-27'],
  neuralnet01: ['But what is a neural network?', '3Blue1Brown', 'Education', 'PT18M40S', '2017-10-05'],
  foodlabeggs: ['The Food Lab: Perfect Scrambled Eggs, Three Ways', 'J. Kenji López-Alt', 'Howto & Style', 'PT12M10S', '2021-02-11'],
  linegoesup1: ['Line Goes Up — The Problem With NFTs', 'Folding Ideas', 'Film & Animation', 'PT2H18M17S', '2022-01-21'],
  synchroniz1: ['The Surprising Secret of Synchronization', 'Veritasium', 'Education', 'PT20M57S', '2021-03-31'],
  khruangbin1: ['Khruangbin — Full Performance (Live on KEXP)', 'KEXP', 'Music', 'PT25M3S', '2018-04-30'],
  planesfast1: ['Why Planes Don’t Fly Faster', 'Wendover Productions', 'Education', 'PT14M2S', '2019-06-12'],
  arrivalsp01: ['Arrival — Communication & Language', 'Lessons from the Screenplay', 'Film & Animation', 'PT15M33S', '2017-02-08'],
  artofcode01: ['The Art of Code', 'NDC Conferences', 'Science & Technology', 'PT1H0M53S', '2018-02-07'],
  catstables1: ['Why Cats Push Things Off Tables', 'SciShow', 'Education', 'PT4M58S', '2020-11-03'],
  friendpix01: ['How Pixar Writes a Story', 'Lessons from the Screenplay', 'Film & Animation', 'PT17M4S', '2020-04-02'],
  friendpaak1: ['Anderson .Paak & The Free Nationals: Tiny Desk Concert', 'NPR Music', 'Music', 'PT15M51S', '2016-08-01'],
  friendsr711: ['The Engineering of the SR-71 Blackbird', 'Real Engineering', 'Science & Technology', 'PT21M9S', '2019-07-26'],
  friendbread: ['Baking Bread With a 150-Year-Old Starter', 'Ethan Chlebowski', 'Howto & Style', 'PT13M40S', '2022-03-18'],
};
const IMG = {
  kurosawa001: 'camera.png', theegg00001: 'hubble_deep_field.jpg', tinydesk001: 'brick.png', neuralnet01: 'moon.png',
  foodlabeggs: 'coffee.png', linegoesup1: 'coins.png', synchroniz1: 'astronaut.png', khruangbin1: 'retina.jpg',
  planesfast1: 'rocket.jpg', arrivalsp01: 'horse.png', artofcode01: 'ihc.png', catstables1: 'chelsea.png',
};
const POOL = ['camera.png', 'hubble_deep_field.jpg', 'astronaut.png', 'rocket.jpg', 'coffee.png', 'moon.png', 'motorcycle_left.png', 'chelsea.png', 'retina.jpg', 'ihc.png', 'grass.png', 'motorcycle_right.png', 'coins.png', 'brick.png'];
const imgFor = (id) => IMG[id] || POOL[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % POOL.length];

// Flat, film-toned placeholders when no stand-in photos are available.
const TONES = [['#5b4a3a', '#2c241d'], ['#3e4a44', '#1f2622'], ['#6b5640', '#352a1f'], ['#47404f', '#231f28'], ['#5d3b32', '#2e1d19'], ['#3b4652', '#1c2229'], ['#706650', '#383327'], ['#4f3d45', '#271e22']];
function placeholder(id) {
  const [a, b] = TONES[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % TONES.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="${a}"/><rect y="430" width="1280" height="290" fill="${b}"/><circle cx="930" cy="250" r="90" fill="${b}" opacity=".55"/></svg>`;
}

const video = (id) => {
  const v = V[id] || MINE.find((m) => m[0] === id)?.slice(1) || HISTORY.find((h) => h[0] === id)?.slice(1);
  if (!v) return { id };
  return { id, title: v[0], channel: v[1], category: v[2] || null };
};

const rec = (id, avg, count, because, source) => ({
  video: video(id), matchScore: Math.round(avg * 10), avgRating: avg, recommenderCount: count, source, because, reason: '',
});

const RECS = [
  rec('kurosawa001', 9.1, 3, { kind: 'neighbour', name: 'Sam Okafor', similarity: 82, rating: 9 }, 'similar_users'),
  rec('theegg00001', 8.9, 41, { kind: 'category', category: 'Education' }, 'category'),
  rec('tinydesk001', 9.5, 2, { kind: 'neighbour', name: 'Ines Halloran', similarity: 77, rating: 10 }, 'similar_users'),
  rec('neuralnet01', 9.3, 18, { kind: 'channel', channel: '3Blue1Brown' }, 'channel'),
  rec('foodlabeggs', 8.6, 9, { kind: 'neighbour', name: 'Maya Chen', similarity: 71, rating: 9 }, 'similar_users'),
  rec('linegoesup1', 9.0, 23, { kind: 'community' }, 'popular'),
  rec('synchroniz1', 8.8, 15, { kind: 'category', category: 'Education' }, 'category'),
  rec('khruangbin1', 9.2, 4, { kind: 'neighbour', name: 'Theo Lindqvist', similarity: 68, rating: 10 }, 'similar_users'),
  rec('planesfast1', 8.4, 11, { kind: 'community' }, 'popular'),
  rec('arrivalsp01', 8.7, 6, { kind: 'neighbour', name: 'Sam Okafor', similarity: 82, rating: 8 }, 'similar_users'),
  rec('artofcode01', 8.9, 7, { kind: 'community' }, 'popular'),
  rec('catstables1', 7.9, 12, { kind: 'community' }, 'popular'),
];

const MINE = [
  ['mine0000001', 'Edgar Wright — How to Do Visual Comedy', 'Every Frame a Painting', 9, '2026-11-05T19:10:00Z'],
  ['mine0000002', 'The Essence of Calculus', '3Blue1Brown', 9, '2026-11-04T21:00:00Z'],
  ['mine0000003', 'Tyler, The Creator: Tiny Desk Concert', 'NPR Music', 8, '2026-11-02T18:30:00Z'],
  ['mine0000004', 'How to Make the Perfect French Omelette', 'J. Kenji López-Alt', 7, '2026-10-30T12:00:00Z'],
  ['mine0000005', 'Satoshi Kon — Editing Space & Time', 'Every Frame a Painting', 10, '2026-10-28T22:15:00Z'],
  ['mine0000006', 'What Is Dust?', 'Kurzgesagt – In a Nutshell', 8, '2026-10-26T20:00:00Z'],
  ['mine0000007', 'The Bizarre Behavior of Rotating Bodies', 'Veritasium', 9, '2026-10-21T17:45:00Z'],
  ['mine0000008', 'Hiatus Kaiyote — Full Performance (Live on KEXP)', 'KEXP', 9, '2026-10-19T23:05:00Z'],
  ['mine0000009', 'Why Container Ships Are So Big', 'Wendover Productions', 6, '2026-10-15T13:20:00Z'],
  ['mine0000010', 'Parasite — Symbolism & Meaning', 'Lessons from the Screenplay', 8, '2026-10-12T21:40:00Z'],
  ['mine0000011', 'The Unreasonable Effectiveness of Spreadsheets', 'NDC Conferences', 7, '2026-10-09T10:00:00Z'],
  ['mine0000012', 'Jackie Chan — How to Do Action Comedy', 'Every Frame a Painting', 10, '2026-10-03T19:00:00Z'],
  ['mine0000013', 'A Day at the Bottom of the Ocean', 'BBC Earth', 8, '2026-09-28T20:30:00Z'],
  ['mine0000014', 'Exponential Growth and Epidemics', '3Blue1Brown', 9, '2026-09-21T16:00:00Z'],
];
// Publish dates and lengths for the poll's "your 8s and above from 2026" (sample data).
const MINE_DETAILS = {
  mine0000001: ['2026-03-02', 'PT8M23S'], mine0000002: ['2026-04-28', 'PT17M5S'], mine0000003: ['2026-06-14', 'PT24M20S'],
  mine0000005: ['2026-05-11', 'PT9M45S'], mine0000007: ['2026-08-19', 'PT14M47S'], mine0000008: ['2026-02-07', 'PT27M2S'],
  mine0000012: ['2026-09-30', 'PT9M23S'], mine0000014: ['2026-10-02', 'PT23M1S'],
};
const MY_RATINGS = (n, extra = []) => [...MINE.slice(0, n), ...extra].map(([id, title, channel, score, ratedAt]) => ({
  videoId: id, score, ratedAt,
  video: { title, channel, thumbnail: null, category: null, publishedAt: MINE_DETAILS[id]?.[0] || '2019-01-01', duration: MINE_DETAILS[id]?.[1] || 'PT12M0S' },
}));

const HISTORY = [
  ['hist0000001', 'How a Motorcycle Engine Works', 'Animagraffs', 6],
  ['hist0000002', 'Restoring a Japanese Stone Garden', 'Garden Diaries', 4],
  ['hist0000003', 'A Year in a Wildflower Meadow', 'BBC Earth', 3],
  ['hist0000004', 'Rebuilding a 1972 Honda CB350', 'Restoration Garage', 3],
  ['hist0000005', 'Coffee Brewing Ratios, Explained', 'James Hoffmann', 2],
  ['hist0000006', 'Roger Deakins on Lighting a Scene', 'Team Deakins', 2],
  ['hist0000007', 'The Deepest Image of the Universe', 'PBS Space Time', 1],
  ['hist0000008', 'Life Aboard the Space Station', 'NASA', 1],
];
const historyStore = () => HISTORY.map(([id, title, channel, count], i) => ({
  id, title, channel, watchCount: count, watchedAt: new Date(Date.now() - (i + 1) * 86400000).toISOString(), description: '',
}));

const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();
const FEED = [
  { id: 'a1', type: 'rating', user: { id: 'u-sam', name: 'Sam Okafor' }, videoId: 'kurosawa001', data: { score: 9, title: V.kurosawa001[0] }, createdAt: hoursAgo(2) },
  { id: 'a2', type: 'rating', user: { id: 'u-ines', name: 'Ines Halloran' }, videoId: 'tinydesk001', data: { score: 10, title: V.tinydesk001[0] }, createdAt: hoursAgo(5) },
  { id: 'a3', type: 'rating', user: { id: 'u-maya', name: 'Maya Chen' }, videoId: 'foodlabeggs', data: { score: 8, title: V.foodlabeggs[0] }, createdAt: hoursAgo(26) },
  { id: 'a4', type: 'rating', user: { id: 'u-theo', name: 'Theo Lindqvist' }, videoId: 'khruangbin1', data: { score: 10, title: V.khruangbin1[0] }, createdAt: hoursAgo(51) },
  { id: 'a5', type: 'rating', user: { id: 'u-sam', name: 'Sam Okafor' }, videoId: 'friendpix01', data: { score: 9, title: V.friendpix01[0] }, createdAt: hoursAgo(3) },
  { id: 'a6', type: 'rating', user: { id: 'u-ines', name: 'Ines Halloran' }, videoId: 'friendpaak1', data: { score: 10, title: V.friendpaak1[0] }, createdAt: hoursAgo(9) },
  { id: 'a7', type: 'rating', user: { id: 'u-theo', name: 'Theo Lindqvist' }, videoId: 'friendsr711', data: { score: 8, title: V.friendsr711[0] }, createdAt: hoursAgo(30) },
  { id: 'a8', type: 'rating', user: { id: 'u-maya', name: 'Maya Chen' }, videoId: 'friendbread', data: { score: 9, title: V.friendbread[0] }, createdAt: hoursAgo(55) },
];

const COMMUNITY = {
  picks: [
    { video: { id: 'comm0000001', title: 'Why Rockets Are So Loud', channel: 'Real Engineering' }, avgRating: 9.2, ratingCount: 31 },
    { video: { id: 'comm0000002', title: 'The Colour of the Inside of Your Eye', channel: 'Vsauce' }, avgRating: 9.1, ratingCount: 27 },
    { video: { id: 'comm0000003', title: 'The Secret Life of a Ship’s Cat', channel: 'Tom Scott' }, avgRating: 9.0, ratingCount: 19 },
    { video: { id: 'comm0000004', title: 'How We Mapped the Far Side of the Moon', channel: 'Scott Manley' }, avgRating: 8.9, ratingCount: 22 },
    { video: { id: 'comm0000005', title: 'Seeing Cells Divide in Real Time', channel: 'Journey to the Microcosmos' }, avgRating: 8.9, ratingCount: 14 },
    { video: { id: 'comm0000006', title: 'The Bricklayer’s Guide to Arches', channel: 'Stuff Made Here' }, avgRating: 8.8, ratingCount: 12 },
  ],
};

const SAM = {
  id: 'u-sam', viewerId: 'u-me', name: 'Sam Okafor', avatar: null,
  bio: 'Film essays, long documentaries, and anything about how things are made.',
  favourites: [
    { id: 'mine0000005', title: 'Satoshi Kon — Editing Space & Time', channel: 'Every Frame a Painting' },
    { id: 'linegoesup1', title: 'Line Goes Up — The Problem With NFTs', channel: 'Folding Ideas' },
    { id: 'theegg00001', title: 'The Egg — A Short Story', channel: 'Kurzgesagt – In a Nutshell' },
    { id: 'khruangbin1', title: 'Khruangbin — Full Performance (Live on KEXP)', channel: 'KEXP' },
  ],
  ratings: [
    ['kurosawa001', 9], ['mine0000001', 9], ['mine0000002', 8], ['mine0000005', 10], ['mine0000007', 9], ['mine0000012', 9],
    ['mine0000014', 8], ['linegoesup1', 10], ['arrivalsp01', 8], ['planesfast1', 7], ['theegg00001', 9], ['catstables1', 6],
    ['khruangbin1', 9], ['synchroniz1', 8], ['mine0000009', 5], ['artofcode01', 8],
  ].map(([id, score], i) => ({ id: `r${i}`, videoId: id, score, videoTitle: video(id).title, videoChannel: video(id).channel })),
  followerCount: 3,
  followingCount: 2,
  isFollowing: true,
  bothSaved: [
    { id: 'friendpix01', title: 'How Pixar Writes a Story', channel: 'Lessons from the Screenplay' },
    { id: 'saved000005', title: 'In Search of a Flat Earth', channel: 'Folding Ideas' },
    { id: 'saved000001', title: 'Bob Ross - Island in the Wilderness (Season 29 Episode 1)', channel: 'Bob Ross' },
  ],
};

const PEOPLE = [
  { id: 'u-sam', name: 'Sam Okafor', avatar: null, bio: 'Film essays, long documentaries, and anything about how things are made.', totalRatings: 212 },
  { id: 'u-ines', name: 'Ines Halloran', avatar: null, bio: 'Tiny Desk completist.', totalRatings: 148 },
  { id: 'u-maya', name: 'Maya Chen', avatar: null, bio: null, totalRatings: 63 },
  { id: 'u-theo', name: 'Theo Lindqvist', avatar: null, bio: 'Live sessions and slow TV.', totalRatings: 97 },
];

const STATS = { averageRating: 9.1, totalRatings: 37, ratingDistribution: { 10: 12, 9: 14, 8: 7, 7: 3, 6: 1 } };

const daysAgo = (d) => new Date(Date.now() - d * 86400000 - 3 * 3600000).toISOString();

// Saved: [id, title, channel, duration, saved days ago, moods, friends who saved it, members' smoothed score]
const SAVED = [
  ['friendpix01', 'How Pixar Writes a Story', 'Lessons from the Screenplay', 'PT17M4S', 1, ['thought-provoking'], ['Sam Okafor'], 9.1],
  ['friendsr711', 'The Engineering of the SR-71 Blackbird', 'Real Engineering', 'PT21M9S', 2, ['mind-blowing'], ['Theo Lindqvist'], 8.8],
  ['comm0000001', 'Why Rockets Are So Loud', 'Real Engineering', 'PT12M18S', 3, ['mind-blowing'], [], 9.0],
  ['saved000001', 'Bob Ross - Island in the Wilderness (Season 29 Episode 1)', 'Bob Ross', 'PT26M47S', 4, ['calming', 'cosy'], ['Ines Halloran'], 8.6],
  ['saved000002', 'Primitive Technology: Tiled Roof Hut', 'Primitive Technology', 'PT11M2S', 6, ['calming'], [], 8.7],
  ['saved000003', 'Japanese Breakfast: Tiny Desk Concert', 'NPR Music', 'PT16M2S', 8, ['cosy', 'moving'], ['Ines Halloran', 'Maya Chen'], 8.4],
  ['saved000004', 'Who’s Afraid of Modern Art?', 'Jacob Geller', 'PT28M14S', 9, ['thought-provoking'], [], 8.9],
  ['saved000005', 'In Search of a Flat Earth', 'Folding Ideas', 'PT37M23S', 12, ['funny', 'thought-provoking'], ['Sam Okafor'], 8.8],
  ['saved000006', 'Disney’s FastPass: A Complicated History', 'Defunctland', 'PT1H49M45S', 15, ['funny'], [], 9.2],
  ['saved000007', 'The Marvel Symphonic Universe', 'Every Frame a Painting', 'PT13M15S', 18, [], [], 8.5],
  ['saved000008', 'Fred again.. | Boiler Room London', 'Boiler Room', 'PT1H0M31S', 21, ['intense'], ['Theo Lindqvist'], 8.3],
  ['catstables1', 'Why Cats Push Things Off Tables', 'SciShow', 'PT4M58S', 25, ['funny'], [], 7.6],
];
const seconds = (iso) => { const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso); return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0); };
const MOOD_WORDS = { calming: 'calming', funny: 'funny', 'mind-blowing': 'mind-blowing', moving: 'moving', cosy: 'cosy', intense: 'intense', 'thought-provoking': 'thought-provoking', 'slow-burn': 'slow burn' };
const moodLineOf = (moods) => (moods.length === 0 ? null : moods.length === 1 ? `Mostly ${MOOD_WORDS[moods[0]]}` : `${MOOD_WORDS[moods[0]][0].toUpperCase()}${MOOD_WORDS[moods[0]].slice(1)} and ${MOOD_WORDS[moods[1]]}`);
const SAVED_ITEMS = SAVED.map(([id, title, channel, duration, d, moods, friends, likely]) => ({
  id, title, channel, duration, seconds: seconds(duration), publishedAt: '2026-01-01', savedAt: daysAgo(d), source: 'card',
  moods: moods.map((m, i) => ({ mood: m, share: i ? 0.38 : 0.64 })), moodLine: moodLineOf(moods), likely, friends,
}));
for (const [id, title, channel, duration] of SAVED) if (!V[id]) V[id] = [title, channel, null, duration, '2026-03-01'];

// The poll. Real videos with sample dates, so the layouts can be judged.
const POLL = {
  slug: '2026', title: 'The best of YouTube in 2026', year: 2026,
  opensAt: '2026-12-01T00:00:00Z', votingAt: '2026-12-15T00:00:00Z', closesAt: '2027-01-01T00:00:00Z', publishedAt: '2027-01-15T12:00:00Z',
  eligibleFrom: '2026-01-01T00:00:00Z', eligibleUntil: '2027-01-01T00:00:00Z',
  rules: { nominationsPerCategory: 3, nominationsToBallot: 2, minAccountDays: 7, minRatings: 10, priorWeight: 5, minCountedRatings: 5, runnersUp: 4 },
};
const CATS = [
  ['video-essay', 'Video essay', 'An argument you couldn’t stop thinking about.', null],
  ['live-performance', 'Live performance', 'Sessions, sets and concerts that felt like being in the room.', null],
  ['explainer', 'Explainer', 'Science, maths and technology, made clear at last.', null],
  ['documentary', 'Documentary and long-form', 'Deep dives worth every minute, however many there are.', null],
  ['short', 'Short', 'Under ten minutes, and not a second wasted.', 599],
];
const NV = {
  essay000001: ['Who’s Afraid of Modern Art?', 'Jacob Geller', 'PT28M14S'],
  essay000002: ['In Search of a Flat Earth', 'Folding Ideas', 'PT37M23S'],
  essay000003: ['The Marvel Symphonic Universe', 'Every Frame a Painting', 'PT13M15S'],
  essay000004: ['The Spielberg Oner', 'Every Frame a Painting', 'PT5M49S'],
  khruangbin1: ['Khruangbin — Full Performance (Live on KEXP)', 'KEXP', 'PT25M3S'],
  tinydesk001: ['Mac Miller: Tiny Desk Concert', 'NPR Music', 'PT16M2S'],
  friendpaak1: ['Anderson .Paak & The Free Nationals: Tiny Desk Concert', 'NPR Music', 'PT15M51S'],
  boiler00001: ['Fred again.. | Boiler Room London', 'Boiler Room', 'PT1H0M31S'],
  neuralnet01: ['But what is a neural network?', '3Blue1Brown', 'PT18M40S'],
  synchroniz1: ['The Surprising Secret of Synchronization', 'Veritasium', 'PT20M57S'],
  planesfast1: ['Why Planes Don’t Fly Faster', 'Wendover Productions', 'PT14M2S'],
  fastpass001: ['Disney’s FastPass: A Complicated History', 'Defunctland', 'PT1H49M45S'],
  linegoesup1: ['Line Goes Up — The Problem With NFTs', 'Folding Ideas', 'PT2H18M17S'],
  plagiarism1: ['Plagiarism and You(Tube)', 'hbomberguy', 'PT3H50M15S'],
  theegg00001: ['The Egg — A Short Story', 'Kurzgesagt – In a Nutshell', 'PT7M54S'],
  catstables1: ['Why Cats Push Things Off Tables', 'SciShow', 'PT4M58S'],
  dust0000001: ['What Is Dust?', 'Kurzgesagt – In a Nutshell', 'PT6M41S'],
};
for (const [id, [title, channel, duration]] of Object.entries(NV)) if (!V[id]) V[id] = [title, channel, null, duration, '2026-06-01'];
const nominee = (id, extra = {}) => ({ videoId: id, title: NV[id][0], channel: NV[id][1], duration: NV[id][2], publishedAt: '2026-06-01T00:00:00Z', available: true, ...extra });
const ballot = (id) => nominee(id, {});
const NOMINATIONS = {
  'video-essay': { mine: [nominee('essay000001', { status: 'ballot' })], entries: [nominee('essay000002', { status: 'needs', needs: 1 }), nominee('essay000004', { status: 'needs', needs: 2 }), nominee('essay000003', { status: 'ballot' })] },
  'live-performance': { mine: [nominee('khruangbin1', { status: 'ballot' }), nominee('tinydesk001', { status: 'needs', needs: 1 })], entries: [nominee('boiler00001', { status: 'needs', needs: 1 }), nominee('friendpaak1', { status: 'ballot' })] },
  explainer: { mine: [], entries: [nominee('synchroniz1', { status: 'needs', needs: 1 }), nominee('planesfast1', { status: 'needs', needs: 2 }), nominee('neuralnet01', { status: 'ballot' })] },
  documentary: { mine: [nominee('fastpass001', { status: 'ballot' })], entries: [nominee('plagiarism1', { status: 'needs', needs: 1 }), nominee('linegoesup1', { status: 'elsewhere', elsewhere: 'Video essay' })] },
  short: { mine: [], entries: [nominee('catstables1', { status: 'needs', needs: 1 }), nominee('theegg00001', { status: 'ballot' })] },
};
const BALLOT = {
  'video-essay': ['essay000002', 'essay000001', 'linegoesup1', 'essay000003'],
  'live-performance': ['friendpaak1', 'boiler00001', 'khruangbin1', 'tinydesk001'],
  explainer: ['synchroniz1', 'neuralnet01', 'planesfast1'],
  documentary: ['plagiarism1', 'fastpass001'],
  short: ['dust0000001', 'theegg00001', 'catstables1'],
};
// Ballot videos the sample member has rated (the strip shows them).
const VOTED = [
  ['essay000001', NV.essay000001[0], NV.essay000001[1], 9, '2026-12-16T20:00:00Z'],
  ['khruangbin1', NV.khruangbin1[0], NV.khruangbin1[1], 10, '2026-12-17T21:00:00Z'],
  ['tinydesk001', NV.tinydesk001[0], NV.tinydesk001[1], 8, '2026-12-17T21:30:00Z'],
  ['neuralnet01', NV.neuralnet01[0], NV.neuralnet01[1], 9, '2026-12-18T19:00:00Z'],
];
const pollView = (phase) => ({
  poll: { ...POLL, phase },
  admin: false,
  standing: { ratingCount: 14, counts: true, tooNew: false, ratingsNeeded: 0, countsFrom: '2026-10-01T00:00:00Z' },
  categories: CATS.map(([slug, title, blurb, maxSeconds]) => ({
    slug, title, blurb, maxSeconds, minSeconds: null,
    mine: phase === 'nominations' ? NOMINATIONS[slug].mine : [],
    entries: phase === 'upcoming' ? [] : phase === 'nominations' ? NOMINATIONS[slug].entries : BALLOT[slug].map(ballot),
  })),
});
const RESULTS = {
  poll: { ...POLL, phase: 'results' }, ready: true, preview: false, countedRatings: 1284,
  categories: [
    ['video-essay', [['essay000002', 9.3, 61], ['essay000001', 9.1, 48], ['linegoesup1', 9.0, 77], ['essay000003', 8.7, 39]]],
    ['live-performance', [['khruangbin1', 9.4, 52], ['friendpaak1', 9.2, 66], ['boiler00001', 8.9, 31], ['tinydesk001', 8.8, 44]]],
    ['explainer', [['neuralnet01', 9.5, 83], ['synchroniz1', 9.0, 58], ['planesfast1', 8.4, 29]]],
    ['documentary', [['fastpass001', 9.2, 47], ['plagiarism1', 9.1, 55]]],
    ['short', [['theegg00001', 9.0, 72], ['dust0000001', 8.6, 25], ['catstables1', 7.9, 21]]],
  ].map(([slug, rows]) => {
    const [, title, blurb] = CATS.find((c) => c[0] === slug);
    const ranked = rows.map(([id, score, count], i) => ({ rank: i + 1, videoId: id, title: NV[id][0], channel: NV[id][1], duration: NV[id][2], publishedAt: '2026-06-01T00:00:00Z', available: true, score, count }));
    return { slug, title, blurb, winner: ranked[0], runnersUp: ranked.slice(1), unranked: 0 };
  }),
};

const SEARCH = {
  videos: ['kurosawa001', 'arrivalsp01', 'linegoesup1', 'mine0000005', 'mine0000012', 'mine0000010'].map((id, i) => ({
    ...video(id), publishedAt: ['2015-03-20', '2017-02-08', '2022-01-21', '2016-06-29', '2014-12-02', '2019-11-25'][i],
  })),
};

// ---------- routing ----------
async function wire(context, { signedIn = true, ratedCount = 14, locked = false, phase = 'upcoming', sealed = false, voted = false, savedEmpty = false }) {
  const SESSION = signedIn ? { user: { name: 'Alex Moreau', email: 'alex@example.com', image: null }, expires: '2099-01-01T00:00:00.000Z' } : {};
  // Registered first: Playwright gives later routes priority, so the specific
  // stubs below override this catch-all block.
  await context.route(/^https:\/\/(?!localhost)[^/]*(youtube|google)/, (route) => route.abort());
  await context.route('https://i.ytimg.com/**', async (route) => {
    const m = /\/vi\/([^/]+)\//.exec(route.request().url());
    const id = m ? m[1] : 'x';
    if (SRC) {
      const file = path.join(SRC, imgFor(id));
      if (fs.existsSync(file)) {
        return route.fulfill({ status: 200, contentType: file.endsWith('.png') ? 'image/png' : 'image/jpeg', body: fs.readFileSync(file) });
      }
    }
    return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: placeholder(id) });
  });
  await context.route('https://www.youtube.com/iframe_api', (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `window.YT={PlayerState:{ENDED:0,PLAYING:1},Player:function(el,o){el.style.cssText='position:absolute;inset:0;background:#000 url(https://i.ytimg.com/vi/'+o.videoId+'/maxresdefault.jpg) center/cover';var b=document.createElement('div');b.style.cssText='position:absolute;left:50%;top:50%;width:68px;height:48px;margin:-24px 0 0 -34px;border-radius:12px;background:rgba(15,15,15,.78)';var t=document.createElement('div');t.style.cssText='position:absolute;left:28px;top:14px;border-style:solid;border-width:10px 0 10px 16px;border-color:transparent transparent transparent #fff';b.appendChild(t);el.appendChild(b);this.destroy=function(){};}};if(window.onYouTubeIframeAPIReady)window.onYouTubeIframeAPIReady();`,
  }));
  await context.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const p = url.pathname;
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (p === '/api/auth/session') return json(SESSION);
    if (p.startsWith('/api/auth/')) return json({});
    if (p === '/api/my-ratings') return json(MY_RATINGS(ratedCount, voted ? VOTED : []));
    if (p === '/api/saved') {
      if (url.searchParams.get('ids')) return json({ ids: savedEmpty ? [] : SAVED_ITEMS.map((v) => ({ videoId: v.id, savedAt: v.savedAt })) });
      if (route.request().method() === 'GET') return json({ items: savedEmpty ? [] : SAVED_ITEMS });
      return json({ saved: true });
    }
    if (p === '/api/moods') return json({ myMoods: ['funny'], moods: [{ mood: 'funny', share: 0.71, count: 12 }], moodLine: 'Mostly funny' });
    if (p === '/api/human') return json({ ok: true, skipped: true });
    if (p === '/api/polls/2026') return json(pollView(phase));
    if (p === '/api/polls/2026/nominate') return json(pollView('nominations'));
    if (p === '/api/polls/2026/results') return json(RESULTS);
    if (p === '/api/me') return json({ id: 'u-me', name: 'Alex Moreau', avatar: null, bio: null });
    if (p === '/api/recommendations') return locked ? json({ error: 'Need at least 10 ratings', userRatingCount: ratedCount }, 400) : json({ recommendations: RECS });
    if (p === '/api/community') return json(COMMUNITY);
    if (p === '/api/feed') return json(FEED);
    if (p === '/api/video-details') {
      const ids = JSON.parse(route.request().postData() || '{}').videoIds || [];
      return json({ videos: ids.map((id) => { const v = video(id); const d = V[id]; const m = MINE_DETAILS[id]; return { ...v, found: true, duration: m ? m[1] : d ? d[3] : 'PT9M12S', publishedAt: m ? m[0] : d ? d[4] : '2020-05-01', embeddable: true }; }) });
    }
    if (/^\/api\/video\/[^/]+\/stats$/.test(p)) {
      if (sealed) return json({ sealed: { poll: '2026', year: 2026, category: 'Video essay', until: POLL.publishedAt }, averageRating: null, totalRatings: null, ratingDistribution: {}, moods: [], moodLine: null, myMoods: [] });
      return json({ ...STATS, sealed: null, moods: [{ mood: 'funny', share: 0.71, count: 12 }], moodLine: 'Mostly funny', myMoods: ['funny'] });
    }
    if (p === '/api/favorites') return json([]);
    if (p === '/api/privacy') return json({ discoverable: true, publicProfile: true, showActivity: true, allowRecommendations: true });
    if (p === '/api/profile/u-sam') return json(SAM);
    if (p === '/api/profile/me') return json({ ...SAM, id: 'u-me', name: 'Alex Moreau', bio: 'Mostly film essays and live music.', isFollowing: false, bothSaved: [], ratings: MY_RATINGS(14).map((r, i) => ({ id: `m${i}`, videoId: r.videoId, score: r.score, videoTitle: r.video.title, videoChannel: r.video.channel })) });
    if (p === '/api/following') return json(PEOPLE);
    if (p === '/api/followers') return json(PEOPLE.slice(0, 3));
    if (p === '/api/youtube/search') return json({ local: SEARCH.videos.slice(0, 2), videos: SEARCH.videos.slice(2) });
    if (p === '/api/users/search') return json(PEOPLE.map((x) => ({ ...x, isFollowing: x.id === 'u-sam' })));
    return json({});
  });
}

async function prime(context, { theme = 'light', history = false, why = false }) {
  const programme = why ? { kurosawa001: { ...video('kurosawa001'), why: 'Sam Okafor, your 82% taste match, gave it a 9. Two others like you rated it highly too.' } } : null;
  await context.addInitScript(({ theme, history, programme }) => {
    try {
      localStorage.setItem('ratings_migrated', 'true');
      localStorage.setItem('matinee_owner', 'alex@example.com');
      localStorage.setItem('theme', theme);
      localStorage.setItem('youtube_rating_videos', JSON.stringify(history || []));
      if (programme) sessionStorage.setItem('matinee:videos', JSON.stringify(programme));
    } catch (e) {}
  }, { theme, history: history ? historyStore() : null, programme });
}

const SCENARIOS = {
  'landing-light': { path: '/', signedIn: false, theme: 'light', wait: '.welcome' },
  'landing-dark': { path: '/', signedIn: false, theme: 'dark', wait: '.welcome' },
  'today-light': { path: '/', theme: 'light', history: true, wait: '.feature' },
  'today-dark': { path: '/', theme: 'dark', history: true, wait: '.feature' },
  'today-cold': { path: '/', theme: 'light', history: true, ratedCount: 4, locked: true, wait: '.meter' },
  'watch-light': { path: '/watch/kurosawa001', theme: 'light', why: true, wait: '.watch' },
  'watch-dark': { path: '/watch/kurosawa001', theme: 'dark', why: true, wait: '.watch' },
  'diary-light': { path: '/diary', theme: 'light', history: true, wait: '.month' },
  'history-light': { path: '/diary?tab=history', theme: 'light', history: true, wait: '.row' },
  'profile-light': { path: '/profile/u-sam', theme: 'light', wait: '.profile-head' },
  'settings-light': { path: '/settings', theme: 'light', wait: '.setting-group' },
  'search-light': { path: '/search', theme: 'light', wait: '.searchbar', act: async (page) => { await page.fill('#q', 'film essays'); await page.click('button[type=submit]'); await page.waitForSelector('.rows .row'); } },
  'privacy-light': { path: '/privacy', theme: 'light', wait: '.legal' },
  'watch-rated': { path: '/watch/mine0000001', theme: 'light', wait: '.watch' },
  'saved-light': { path: '/saved', theme: 'light', wait: '.minutes__pick' },
  'saved-dark': { path: '/saved', theme: 'dark', wait: '.minutes__pick' },
  'saved-calming': { path: '/saved', theme: 'light', wait: '.minutes__pick', act: async (page) => { await page.click('.filters__row:nth-child(2) .chip:first-child'); await page.waitForTimeout(400); } },
  'saved-empty': { path: '/saved', theme: 'light', savedEmpty: true, wait: '.empty' },
  'saved-mobile': { path: '/saved', theme: 'light', wait: '.minutes__pick', mobile: true },
  'share-light': { path: '/share?text=Watch%20this%20https%3A%2F%2Fyoutu.be%2Fsaved000002', theme: 'light', wait: '.share' },
  'polls-light': { path: '/polls', theme: 'light', wait: '.poll-card' },
  'poll-upcoming': { path: '/polls/2026', theme: 'light', phase: 'upcoming', wait: '.contents' },
  'poll-upcoming-dark': { path: '/polls/2026', theme: 'dark', phase: 'upcoming', wait: '.contents' },
  'poll-nominations': { path: '/polls/2026', theme: 'light', phase: 'nominations', clock: '2026-12-05T18:00:00Z', wait: '.slots' },
  'poll-nominations-dark': { path: '/polls/2026', theme: 'dark', phase: 'nominations', clock: '2026-12-05T18:00:00Z', wait: '.slots' },
  'poll-nominate-open': { path: '/polls/2026', theme: 'light', phase: 'nominations', clock: '2026-12-05T18:00:00Z', wait: '.slots', act: async (page) => { await page.click('#video-essay .slot__empty:not([disabled])'); await page.waitForSelector('.nominate'); } },
  'poll-incoming': { path: '/polls/2026?nominate=mine0000001', theme: 'light', phase: 'nominations', clock: '2026-12-05T18:00:00Z', wait: '.incoming' },
  'poll-nominations-mobile': { path: '/polls/2026', theme: 'light', phase: 'nominations', clock: '2026-12-05T18:00:00Z', wait: '.slots', mobile: true },
  'poll-voting': { path: '/polls/2026', theme: 'light', phase: 'voting', voted: true, clock: '2026-12-20T18:00:00Z', wait: '.ballot-row' },
  'poll-voting-dark': { path: '/polls/2026', theme: 'dark', phase: 'voting', voted: true, clock: '2026-12-20T18:00:00Z', wait: '.ballot-row' },
  'poll-voting-mobile': { path: '/polls/2026', theme: 'dark', phase: 'voting', voted: true, clock: '2026-12-20T18:00:00Z', wait: '.ballot-row', mobile: true },
  'poll-results': { path: '/polls/2026/results', theme: 'light', clock: '2027-01-16T18:00:00Z', wait: '.winner' },
  'poll-results-dark': { path: '/polls/2026/results', theme: 'dark', clock: '2027-01-16T18:00:00Z', wait: '.winner' },
  'poll-results-mobile': { path: '/polls/2026/results', theme: 'light', clock: '2027-01-16T18:00:00Z', wait: '.winner', mobile: true },
  'watch-moods': { path: '/watch/mine0000001', theme: 'light', wait: '.tags' },
  'watch-nominate': { path: '/watch/mine0000001', theme: 'dark', clock: '2026-12-05T18:00:00Z', wait: '.next--poll' },
  'watch-sealed': { path: '/watch/essay000001', theme: 'light', sealed: true, clock: '2026-12-20T18:00:00Z', wait: '.watch__poll' },
  'today-december': { path: '/', theme: 'light', history: true, clock: '2026-12-05T18:00:00Z', wait: '.poll-line' },
  'landing-mobile': { path: '/', signedIn: false, theme: 'light', wait: '.welcome', mobile: true },
  'today-mobile': { path: '/', theme: 'light', history: true, wait: '.feature', mobile: true },
  'watch-mobile': { path: '/watch/kurosawa001', theme: 'dark', why: true, wait: '.watch', mobile: true },
};

(async () => {
  const browser = await chromium.launch();
  for (const [name, sc] of Object.entries(SCENARIOS)) {
    if (!WANT.includes('all') && !WANT.includes(name)) continue;
    const opts = sc.mobile ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: DSF };
    const context = await browser.newContext(opts);
    await wire(context, sc);
    await prime(context, sc);
    const page = await context.newPage();
    if (sc.clock) await page.clock.setFixedTime(new Date(sc.clock));
    page.on('pageerror', (e) => console.log(`[${name}] pageerror:`, e.message));
    page.on('console', (m) => { if (m.type() === 'error') console.log(`[${name}] console:`, m.text().slice(0, 200)); });
    try {
      await page.goto(BASE + sc.path, { waitUntil: 'networkidle', timeout: 180000 });
      await page.waitForSelector(sc.wait, { timeout: 60000 });
      if (sc.act) await sc.act(page);
      // Scroll through so lazy-loaded stills arrive before the capture.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 500) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 50));
        }
        window.scrollTo(0, 0);
      });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(600);
      const file = path.join(OUT, `${name}${DSF > 1 ? '@2x' : ''}.png`);
      await page.screenshot({ path: file, fullPage: !sc.mobile || process.env.SHOTS_FULL === '1' });
      console.log('shot', file);
    } catch (e) {
      console.log(`[${name}] FAILED:`, e.message.split('\n')[0]);
      await page.screenshot({ path: path.join(OUT, `${name}-failed.png`) }).catch(() => {});
    }
    await context.close();
  }
  await browser.close();
})();
