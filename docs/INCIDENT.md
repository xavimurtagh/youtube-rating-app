# A bad day: what to do

One page, for when something has gone wrong: a leaked secret, a break-in, data exposed, or the site being attacked. Work down the list. Write down what you do and when, as you go.

## 1. Stop it getting worse (first hour)

- **Traffic attack:** turn on Vercel's firewall challenge mode, or block the addresses involved in the Vercel firewall. If a deploy broke something, roll back to the last good deployment in Vercel.
- **Leaked or suspect secret:** rotate it at the source, then update it in Vercel and redeploy.

  | Secret | Where to rotate it | Side effects |
  | --- | --- | --- |
  | `NEXTAUTH_SECRET` | Generate a new one (`openssl rand -base64 32`) | Everyone is signed out; human-check passes stop working |
  | `GOOGLE_CLIENT_SECRET` | Google Cloud, APIs and Services, Credentials | Sign-in fails until updated |
  | `YOUTUBE_API_KEY` | Google Cloud, Credentials (restrict it to the YouTube Data API) | Search and video details pause until updated |
  | `DATABASE_URL` password | The database host's dashboard | The app is down until updated |
  | `CRON_SECRET` | Generate a new one | None |
  | `UPSTASH_REDIS_REST_TOKEN` | Upstash console | Rate limits fall back to memory until updated |
  | `TURNSTILE_SECRET_KEY` | Cloudflare dashboard, Turnstile | New sign-ups fail until updated |

- **Someone in an account** (GitHub, Vercel, Google Cloud, the database host, the domain registrar, email): sign them out everywhere, change the password, check two-factor and passkeys, and remove any tokens, deploy hooks, collaborators or OAuth apps you don't recognise.

## 2. Work out what happened (first day)

- Export the Vercel logs now: they aren't kept for long.
- Check Vercel's environment variables for changes you didn't make (for example `ADMIN_EMAILS`).
- Check the database for unexpected changes: sudden bursts of accounts or ratings (`ReviewFlag`), changed privacy settings, poll entries removed or restored.
- Decide what personal data could have been seen or changed, and whose.

## 3. Tell the people who need to know

- **The ICO (UK):** a personal data breach that could affect people's rights must be reported within 72 hours of becoming aware of it. If it's unlikely to, record why you decided not to report it.
- **Members:** tell anyone affected, without delay, if the risk to them is high: what happened, what it means for them, and what you've done.
- **Google:** if YouTube API data or Google sign-in was involved, check the YouTube API Services Terms and the Google API Services User Data Policy for what they require you to report.

## 4. Fix it and learn

- Fix the cause, not just the symptom, and add a test or check that would have caught it.
- Write a short note: what happened, how it was found, what was done, what changes now. Keep anything sensitive out of this public repository.
