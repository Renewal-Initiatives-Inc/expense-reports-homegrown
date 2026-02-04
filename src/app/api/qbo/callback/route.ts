/**
 * QBO OAuth callback handler.
 * Exchanges authorization code for tokens and stores them securely.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createOAuthClient, exchangeCodeForTokens } from '@/lib/qbo/client'
import { saveQboTokens } from '@/lib/db/queries/qbo-tokens'

export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const searchParams = request.nextUrl.searchParams
  const state = searchParams.get('state')
  const storedState = request.cookies.get('qbo_oauth_state')?.value

  // Validate state for CSRF protection
  if (!state || state !== storedState) {
    return NextResponse.redirect(new URL('/admin/qbo?error=invalid_state', request.url))
  }

  // Check for OAuth errors
  const error = searchParams.get('error')
  if (error) {
    return NextResponse.redirect(new URL(`/admin/qbo?error=${encodeURIComponent(error)}`, request.url))
  }

  try {
    const oauthClient = createOAuthClient()

    // Construct the full callback URL with all query parameters
    // The intuit-oauth library needs the complete URL to extract the auth code
    const fullUrl = request.nextUrl.toString()
    console.log('QBO callback URL:', fullUrl)

    // Extract realmId from URL - QBO passes it as a query parameter
    const realmId = searchParams.get('realmId')
    if (!realmId) {
      return NextResponse.redirect(new URL('/admin/qbo?error=missing_realm_id', request.url))
    }
    console.log('QBO realmId from URL:', realmId)

    const tokens = await exchangeCodeForTokens(oauthClient, fullUrl)
    console.log('QBO tokens received')

    await saveQboTokens(
      {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        realmId: realmId,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
      session.user.id
    )

    // Clear the state cookie
    const response = NextResponse.redirect(new URL('/admin/qbo?success=connected', request.url))
    response.cookies.delete('qbo_oauth_state')

    return response
  } catch (err) {
    console.error('QBO OAuth callback error:', err)
    const errorMessage = err instanceof Error ? err.message : 'token_exchange_failed'
    return NextResponse.redirect(new URL(`/admin/qbo?error=${encodeURIComponent(errorMessage)}`, request.url))
  }
}
