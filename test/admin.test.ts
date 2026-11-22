import { describe, it, expect, afterEach } from 'vitest'
import { isAdmin } from '../lib/admin'

describe('isAdmin', () => {
  const prev = process.env.ADMIN_EMAILS
  afterEach(() => {
    if (prev === undefined) delete process.env.ADMIN_EMAILS
    else process.env.ADMIN_EMAILS = prev
  })

  it('matches the ADMIN_EMAILS list, ignoring case and spaces', () => {
    process.env.ADMIN_EMAILS = ' Owner@Example.com , second@example.com'
    expect(isAdmin({ email: 'owner@example.com' })).toBe(true)
    expect(isAdmin({ email: 'SECOND@example.com' })).toBe(true)
    expect(isAdmin({ email: 'someone@example.com' })).toBe(false)
  })

  it('is nobody when the list is empty or there is no member', () => {
    delete process.env.ADMIN_EMAILS
    expect(isAdmin({ email: 'owner@example.com' })).toBe(false)
    process.env.ADMIN_EMAILS = 'owner@example.com'
    expect(isAdmin(null)).toBe(false)
    expect(isAdmin({ email: '' })).toBe(false)
  })
})
