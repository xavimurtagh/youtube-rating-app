# Security policy

## Reporting a problem

Please report security problems privately, not in a public issue:

- through GitHub's **Report a vulnerability** button on this repository's Security tab, or
- by email, to the contact on the live site's `/security` page (also at `/.well-known/security.txt`).

Include what you did, what happened, and the page or endpoint involved. You'll get a reply within a few days.

Please test only with your own accounts, don't access or change other people's data, and don't run tests that degrade the service. Research that follows these rules is welcome.

## What's in place

- Sign-in with Google only; accounts are tied to Google's permanent account id, not the email address.
- Privacy settings are enforced on the server.
- Every API write is checked to come from the site (`middleware.ts`) and is rate-limited, with limits shared across instances when Upstash Redis is configured (`lib/rateLimit.ts`).
- Anything that spends YouTube API quota needs a signed-in member and a daily budget (`lib/budget.ts`).
- An "are you a person?" check (Cloudflare Turnstile) on new accounts and on sudden bursts of ratings, when configured (`lib/human.ts`).
- A Content Security Policy and other security headers (`next.config.js`).
- Dependabot and CodeQL (`.github/`).

What to do when something goes wrong: [docs/INCIDENT.md](docs/INCIDENT.md).
