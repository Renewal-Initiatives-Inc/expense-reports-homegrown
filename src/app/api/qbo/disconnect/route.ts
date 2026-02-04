/**
 * QBO disconnect endpoint.
 * Removes stored tokens and clears cache.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { deleteQboTokens } from '@/lib/db/queries/qbo-tokens'
import { invalidateAllCache } from '@/lib/db/queries/qbo-cache'

export async function POST() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    await deleteQboTokens()
    await invalidateAllCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to disconnect QBO:', error)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }
}
