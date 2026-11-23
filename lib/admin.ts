/** Admins are set by the ADMIN_EMAILS env var (comma-separated). They can take poll entries off the ballot. */
export function isAdmin(user: { email?: string | null } | null | undefined): boolean {
  const email = user?.email?.trim().toLowerCase()
  if (!email) return false
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(email)
}
