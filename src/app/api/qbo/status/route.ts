/**
 * QBO status endpoint.
 * Returns connection status and cache information.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getQboStatus } from '@/lib/qbo/service'

export async function GET() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const status = await getQboStatus()

  return NextResponse.json(status)
}
