/**
 * QBO OAuth flow initiation endpoint.
 * Redirects admin users to QuickBooks authorization page.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createOAuthClient, getAuthorizationUrl, isQboConfigured } from '@/lib/qbo/client'
import { randomBytes } from 'crypto'

export async function GET() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins can connect QBO
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  if (!isQboConfigured()) {
    return NextResponse.json({ error: 'QuickBooks not configured. Please set environment variables.' }, { status: 500 })
  }

  const oauthClient = createOAuthClient()
  const state = randomBytes(16).toString('hex')

  // Store state in session/cookie for CSRF protection
  const authUrl = getAuthorizationUrl(oauthClient, state)

  const response = NextResponse.redirect(authUrl)
  response.cookies.set('qbo_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
  })

  return response
}
