/**
 * Which account a Google sign-in belongs to. Pure, so it can be tested.
 *
 * Accounts are tied to Google's permanent account id (the OpenID "sub"), not
 * to the email address. Email addresses can change hands: if a company's
 * domain lapses and someone else registers it, they can create a Google
 * account with an old employee's address. Matching on the address would hand
 * them that person's account.
 */

export interface AccountRow {
  id: string
  email: string
  googleId: string | null
}

export type AccountDecision =
  /** Signed in before; `updateEmail` when Google reports a new, verified address that's free here. */
  | { kind: 'existing'; user: AccountRow; updateEmail: boolean }
  /** An account from before Google ids were recorded: tie it to this Google account. */
  | { kind: 'link'; user: AccountRow }
  /** Nobody here yet: a new member. */
  | { kind: 'create' }
  /** The address belongs to an account tied to a different Google account. Refuse. */
  | { kind: 'conflict'; user: AccountRow }
  /** Google hasn't verified the address, so it can't open or claim an account. */
  | { kind: 'unverified' }

export function decideAccount(
  byGoogleId: AccountRow | null,
  byEmail: AccountRow | null,
  email: string,
  emailVerified: boolean
): AccountDecision {
  if (byGoogleId) {
    const free = !byEmail || byEmail.id === byGoogleId.id
    return { kind: 'existing', user: byGoogleId, updateEmail: byGoogleId.email !== email && free && emailVerified }
  }
  // Linking or creating by address is only as safe as Google's check of it.
  if (!emailVerified) return { kind: 'unverified' }
  if (byEmail) {
    return byEmail.googleId ? { kind: 'conflict', user: byEmail } : { kind: 'link', user: byEmail }
  }
  return { kind: 'create' }
}
