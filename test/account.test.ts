import { describe, it, expect } from 'vitest'
import { decideAccount } from '../lib/account'

const row = (id: string, email: string, googleId: string | null) => ({ id, email, googleId })

describe('decideAccount', () => {
  it('finds a returning member by their Google id', () => {
    const me = row('u1', 'sam@example.com', 'g1')
    expect(decideAccount(me, me, 'sam@example.com', true)).toEqual({ kind: 'existing', user: me, updateEmail: false })
  })

  it('follows a changed address when it is verified and free here', () => {
    const me = row('u1', 'old@example.com', 'g1')
    expect(decideAccount(me, null, 'new@example.com', true)).toMatchObject({ kind: 'existing', updateEmail: true })
    expect(decideAccount(me, null, 'new@example.com', false)).toMatchObject({ kind: 'existing', updateEmail: false })
    // The new address already belongs to someone else here: keep the old one.
    expect(decideAccount(me, row('u2', 'new@example.com', 'g2'), 'new@example.com', true)).toMatchObject({ updateEmail: false })
  })

  it('ties an account from before Google ids were kept, when Google has verified the address', () => {
    const old = row('u1', 'sam@example.com', null)
    expect(decideAccount(null, old, 'sam@example.com', true)).toEqual({ kind: 'link', user: old })
  })

  it('refuses an address that belongs to a different Google account (a lapsed domain)', () => {
    const owner = row('u1', 'jo@lapsed.example', 'g-original')
    expect(decideAccount(null, owner, 'jo@lapsed.example', true)).toEqual({ kind: 'conflict', user: owner })
  })

  it('will not open or claim an account with an unverified address', () => {
    expect(decideAccount(null, null, 'new@example.com', false)).toEqual({ kind: 'unverified' })
    expect(decideAccount(null, row('u1', 'sam@example.com', null), 'sam@example.com', false)).toEqual({ kind: 'unverified' })
  })

  it('creates a new member otherwise', () => {
    expect(decideAccount(null, null, 'new@example.com', true)).toEqual({ kind: 'create' })
  })
})
