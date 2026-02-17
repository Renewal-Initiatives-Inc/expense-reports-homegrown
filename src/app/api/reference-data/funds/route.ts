import { auth } from '@/lib/auth'
import { getCachedFunds } from '@/lib/db/queries/reference-data'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const funds = await getCachedFunds()
    return NextResponse.json({ funds })
  } catch (error) {
    console.error('Failed to fetch funds:', error)
    return NextResponse.json({ error: 'Failed to fetch funds' }, { status: 500 })
  }
}
