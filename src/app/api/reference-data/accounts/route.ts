import { auth } from '@/lib/auth'
import { getCachedAccounts } from '@/lib/db/queries/reference-data'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accounts = await getCachedAccounts()
    return NextResponse.json({ accounts })
  } catch (error) {
    console.error('Failed to fetch accounts:', error)
    return NextResponse.json({ error: 'Failed to fetch GL accounts' }, { status: 500 })
  }
}
