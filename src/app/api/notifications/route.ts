import { auth } from '@/lib/auth'
import { getNotificationsForUser, getUnreadNotificationCount } from '@/lib/db/queries/notifications'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [notifications, unreadCount] = await Promise.all([
      getNotificationsForUser(session.user.id),
      getUnreadNotificationCount(session.user.id),
    ])

    return NextResponse.json({
      notifications,
      unreadCount,
    })
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}
