# Matinee design guide

**Concept: a programme, not a feed.** The app is built like a repertory cinema's
printed programme: a short bill for the day, every film with the reason it's on
it, and a definite end. A gallery, not a casino.

**References** — what each does right, and what we take from it:

| Reference | What it gets right | What we borrow |
| --- | --- | --- |
| Letterboxd | Restraint; the content is the art | Posters/stills carry the page; the chrome stays quiet |
| Mubi | Editorial curation, a finite daily pick | "Now showing", the finite programme |
| Criterion | A collection as identity | Numbering (No. 01), the sense of a canon |
| Are.na | Calm, no algorithmic pressure | Generous space, nothing shouting |
| Pitchfork | The score as typography | Ratings set large in the serif: "8.4" |
| Metrograph | Art-house cinema brand | Paper, ink, one warm accent |

## The rules

These are what keep the product from looking templated. Check every new screen
against them.

1. **Three typefaces, no more.** Newsreader for voice (headlines, titles,
   reasons, scores); Schibsted Grotesk for interface (navigation, labels,
   buttons, body); IBM Plex Mono for figures (dates, durations, counts,
   numbering).
2. **One accent.** Projector amber is for ratings, focus and the active nav
   item. Nothing else is coloured; hierarchy comes from scale and space.
3. **Hairlines, not boxes.** Use the `--rule` tokens. No drop shadows, no
   gradients, no blur, no floating cards. Corners are 2px at most (avatars are
   the only circles).
4. **No emoji and no icon packs.** Text glyphs (→ ↗ ×) only, sparingly.
5. **One big thing per screen.** A headline, a feature, a title — then quieter
   material. Avoid uniform grids of identical cards; vary density (feature, a
   two-up bill, then a numbered list).
6. **Every recommendation shows its reason**, in italic serif under a hairline:
   the placard. The score line carries the numbers; the reason never repeats
   them.
7. **Finite by design.** No infinite scroll, no autoplay, no red badges or
   counters. Things end ("That's it for today").
8. **Never cover YouTube's player.** Prompts appear beside it.
9. **Real content in every mock.** Real titles, real lengths, real names —
   never "Lorem ipsum" or "Video title".

## Voice

- Sentence case everywhere. Plain, specific, warm. No exclamation marks.
- Never: "AI-powered", "unlock", "supercharge", "seamless", "journey", "elevate".
- Spell out small numbers in prose ("Twelve videos chosen for you").
- Say what happened: "Saved. You gave it an 8." — not "Success!"
- Empty states invite, they don't apologise: "Nothing rated yet. Start with your
  watch history."

## Tokens

Defined in `styles/globals.css`.

| Token | Light (programme paper) | Dark (screening room) |
| --- | --- | --- |
| `--paper` | `#f3efe7` | `#13120f` |
| `--paper-2` | `#e9e3d8` | `#1c1a16` |
| `--ink` | `#1a1815` | `#ece6da` |
| `--ink-2` | `#534d45` | `#aaa295` |
| `--ink-3` | `#857d72` | `#7b7369` |
| `--accent` | `#c0651e` | `#e29b4c` |
| `--accent-text` | `#964b0f` (AA on paper) | `#e7a660` |
| `--screen` | `#0e0d0b` (the player band is always dark) | `#0a0908` |

Type scale: `--t-display`, `--t-h1`, `--t-h2` (fluid via `clamp`), `--t-h3`,
`--t-title`, `--t-body` 1rem, `--t-small`, `--t-meta`, `--t-label`.
Spacing: `--s-1` … `--s-10` (4px to 136px). Page width `--page` 78rem; reading
width `--measure` 37rem.

## Signature details

- **The sprocket strip** — the rating control: ten marks like the perforations
  on film. Keyboard: arrows, Home/End, 1–9 and 0 for 10. The same marks form
  the "ten ratings to unlock" meter.
- **Stills** — 16:9, a hairline frame, colour slightly calmed until hover, so
  loud thumbnails sit quietly in the page.
- **The dateline** — mono, uppercase: FRIDAY 6 NOVEMBER 2026.

## Review loop

Before shipping a screen: render it at 1440px and 390px, in light and dark;
compare it against the references above; read it against the rules and the
voice; fix; repeat. Accessibility is part of the review: AA contrast, a visible
amber focus ring, a keyboard path to every action, and `prefers-reduced-motion`
respected.
