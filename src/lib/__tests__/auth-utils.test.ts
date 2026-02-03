import type { Session } from 'next-auth'
import { describe, expect, it } from 'vitest'
import {
  AdminRequiredError,
  AuthRequiredError,
  getUserDisplayName,
  getUserInitials,
  getUserRole,
  isAdmin,
  isAuthenticated,
  requireAdmin,
  requireAuth,
} from '../auth-utils'

// Helper to create mock sessions
const createMockSession = (overrides: Partial<Session['user']> = {}): Session => ({
  user: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    ...overrides,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
})

describe('auth-utils', () => {
  describe('isAdmin', () => {
    it('returns true for admin role', () => {
      const session = createMockSession({ role: 'admin' })
      expect(isAdmin(session)).toBe(true)
    })

    it('returns false for user role', () => {
      const session = createMockSession({ role: 'user' })
      expect(isAdmin(session)).toBe(false)
    })

    it('returns false for null session', () => {
      expect(isAdmin(null)).toBe(false)
    })
  })

  describe('isAuthenticated', () => {
    it('returns true for valid session', () => {
      const session = createMockSession()
      expect(isAuthenticated(session)).toBe(true)
    })

    it('returns false for null session', () => {
      expect(isAuthenticated(null)).toBe(false)
    })
  })

  describe('getUserRole', () => {
    it('returns role from session', () => {
      const session = createMockSession({ role: 'admin' })
      expect(getUserRole(session)).toBe('admin')
    })

    it('returns null for null session', () => {
      expect(getUserRole(null)).toBeNull()
    })
  })

  describe('requireAuth', () => {
    it('does not throw for valid session', () => {
      const session = createMockSession()
      expect(() => requireAuth(session)).not.toThrow()
    })

    it('throws AuthRequiredError for null session', () => {
      expect(() => requireAuth(null)).toThrow(AuthRequiredError)
    })
  })

  describe('requireAdmin', () => {
    it('does not throw for admin session', () => {
      const session = createMockSession({ role: 'admin' })
      expect(() => requireAdmin(session)).not.toThrow()
    })

    it('throws AdminRequiredError for user session', () => {
      const session = createMockSession({ role: 'user' })
      expect(() => requireAdmin(session)).toThrow(AdminRequiredError)
    })

    it('throws AuthRequiredError for null session', () => {
      expect(() => requireAdmin(null)).toThrow(AuthRequiredError)
    })
  })

  describe('getUserDisplayName', () => {
    it('returns name when available', () => {
      const session = createMockSession({ name: 'John Doe' })
      expect(getUserDisplayName(session)).toBe('John Doe')
    })

    it('returns email when name is not available', () => {
      const session = createMockSession({ name: '', email: 'john@example.com' })
      expect(getUserDisplayName(session)).toBe('john@example.com')
    })

    it('returns empty string for null session', () => {
      expect(getUserDisplayName(null)).toBe('')
    })
  })

  describe('getUserInitials', () => {
    it('returns initials from full name', () => {
      const session = createMockSession({ name: 'John Doe' })
      expect(getUserInitials(session)).toBe('JD')
    })

    it('returns first two characters for single name', () => {
      const session = createMockSession({ name: 'John' })
      expect(getUserInitials(session)).toBe('JO')
    })

    it('returns question mark for null session', () => {
      expect(getUserInitials(null)).toBe('?')
    })

    it('handles names with multiple parts', () => {
      const session = createMockSession({ name: 'John Michael Doe' })
      expect(getUserInitials(session)).toBe('JM')
    })
  })
})
