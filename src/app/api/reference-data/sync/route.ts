import { auth } from '@/lib/auth'
import { syncReferenceData } from '@/lib/reference-data/sync'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const result = await syncReferenceData()
    return NextResponse.json({
      message: 'Reference data synced successfully',
      ...result,
    })
  } catch (error) {
    console.error('Failed to sync reference data:', error)
    return NextResponse.json({ error: 'Failed to sync reference data' }, { status: 500 })
  }
}
