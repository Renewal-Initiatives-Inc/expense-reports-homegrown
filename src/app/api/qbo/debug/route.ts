/**
 * Debug/health endpoint for QBO connection status.
 * Returns connection status and cache info without exposing tokens.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getQboTokens, isTokenExpiringSoon } from '@/lib/db/queries/qbo-tokens'
import { getCacheStatus } from '@/lib/db/queries/qbo-cache'
import { isQboConfigured, getQboEnvironment, getQboBaseUrl } from '@/lib/qbo/client'

export async function GET() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const tokens = await getQboTokens()
    const cacheStatus = await getCacheStatus()
    const expiringSoon = tokens ? await isTokenExpiringSoon() : false

    return NextResponse.json({
      environment: getQboEnvironment(),
      baseUrl: getQboBaseUrl(),
      configured: isQboConfigured(),
      connected: tokens !== null,
      realmId: tokens?.realmId || null,
      tokenStatus: tokens
        ? {
            expiresAt: tokens.expiresAt,
            expiringSoon,
            updatedBy: tokens.updatedBy,
          }
        : null,
      cacheStatus: {
        categories: {
          cached: cacheStatus.categories.cached,
          expiresAt: cacheStatus.categories.expiresAt,
        },
        projects: {
          cached: cacheStatus.projects.cached,
          expiresAt: cacheStatus.projects.expiresAt,
        },
      },
      // Tokens are intentionally NOT included for security
    })
  } catch (error) {
    console.error('[QBO Debug] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to get status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
