import { auth } from '@/lib/auth'
import { markAllNotificationsAsRead } from '@/lib/db/queries/notifications'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const count = await markAllNotificationsAsRead(session.user.id)

    return NextResponse.json({ success: true, markedCount: count })
  } catch (error) {
    console.error('Failed to mark notifications as read:', error)
    return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 })
  }
}
