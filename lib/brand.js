// Brand constants. The name is a working name: change it here and it changes
// across the app (also update public/site.webmanifest, the icons and the docs).
// YouTube's branding rules don't allow "YouTube" or "YT" in an app's name or
// domain, though the app may say it works with YouTube.
const name = 'Matinee';

export const BRAND = {
  name,
  title: `${name} — videos worth your time, and why`,
  description:
    'Rate what you watch on YouTube, see what your friends are loving, and get a few picks a day, each with the reason it was chosen.',
  disclaimer: `${name} works with YouTube. It is not affiliated with or endorsed by YouTube or Google.`,
  // Shown on the privacy and terms pages. Set NEXT_PUBLIC_CONTACT_EMAIL before launch.
  contact: process.env.NEXT_PUBLIC_CONTACT_EMAIL || '',
  supportUrl: 'https://liberapay.com/xavstermur/donate',
};
