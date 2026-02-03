import type { Session } from 'next-auth'
import { AppRole } from './auth'

/**
 * Check if the session user has admin role
 */
export function isAdmin(session: Session | null): boolean {
  return session?.user?.role === 'admin'
}

/**
 * Check if the session is authenticated
 */
export function isAuthenticated(session: Session | null): boolean {
  return !!session?.user
}

/**
 * Get the user's role from the session
 */
export function getUserRole(session: Session | null): AppRole | null {
  return session?.user?.role ?? null
}

/**
 * Error thrown when authentication is required but not present
 */
export class AuthRequiredError extends Error {
  constructor(message = 'Authentication required') {
    super(message)
    this.name = 'AuthRequiredError'
  }
}

/**
 * Error thrown when admin role is required but not present
 */
export class AdminRequiredError extends Error {
  constructor(message = 'Admin access required') {
    super(message)
    this.name = 'AdminRequiredError'
  }
}

/**
 * Require authentication - throws if session is not authenticated
 * @throws {AuthRequiredError} If not authenticated
 */
export function requireAuth(session: Session | null): asserts session is Session {
  if (!isAuthenticated(session)) {
    throw new AuthRequiredError()
  }
}

/**
 * Require admin role - throws if user is not an admin
 * @throws {AuthRequiredError} If not authenticated
 * @throws {AdminRequiredError} If not an admin
 */
export function requireAdmin(session: Session | null): asserts session is Session {
  requireAuth(session)
  if (!isAdmin(session)) {
    throw new AdminRequiredError()
  }
}

/**
 * Get user display name from session
 */
export function getUserDisplayName(session: Session | null): string {
  if (!session?.user) return ''
  return session.user.name || session.user.email || 'User'
}

/**
 * Get user initials for avatar fallback
 */
export function getUserInitials(session: Session | null): string {
  const name = getUserDisplayName(session)
  if (!name) return '?'

  const parts = name.split(' ').filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}
