import type { Session } from 'next-auth'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock auth module
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock notification queries
vi.mock('@/lib/db/queries/notifications', () => ({
  getNotificationsForUser: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
}))

import { auth } from '@/lib/auth'
import {
  getNotificationsForUser,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/lib/db/queries/notifications'
import { GET } from '../route'

const createMockSession = (overrides: Partial<Session['user']> = {}): Session => ({
  user: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    ...overrides,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
})

describe('GET /api/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns notifications and unread count for authenticated user', async () => {
    const mockSession = createMockSession()
    vi.mocked(auth).mockResolvedValue(mockSession)

    const mockNotifications = [
      {
        id: 'notif-1',
        userId: 'user-123',
        type: 'report_approved',
        reportId: 'report-1',
        message: 'Your report was approved',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    vi.mocked(getNotificationsForUser).mockResolvedValue(mockNotifications)
    vi.mocked(getUnreadNotificationCount).mockResolvedValue(1)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.notifications).toHaveLength(1)
    expect(data.unreadCount).toBe(1)
    expect(getNotificationsForUser).toHaveBeenCalledWith('user-123')
    expect(getUnreadNotificationCount).toHaveBeenCalledWith('user-123')
  })

  it('returns empty notifications when user has none', async () => {
    const mockSession = createMockSession()
    vi.mocked(auth).mockResolvedValue(mockSession)
    vi.mocked(getNotificationsForUser).mockResolvedValue([])
    vi.mocked(getUnreadNotificationCount).mockResolvedValue(0)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.notifications).toHaveLength(0)
    expect(data.unreadCount).toBe(0)
  })

  it('returns 500 when query fails', async () => {
    const mockSession = createMockSession()
    vi.mocked(auth).mockResolvedValue(mockSession)
    vi.mocked(getNotificationsForUser).mockRejectedValue(new Error('Database error'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch notifications')
  })
})

describe('POST /api/notifications/[id]/read', () => {
  // Import the route handler dynamically because it's in a different file
  let POST: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    // Dynamically import to reset mock state
    const module = await import('../[id]/read/route')
    POST = module.POST
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const response = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'notif-123' }),
    })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('marks notification as read for authenticated user', async () => {
    const mockSession = createMockSession()
    vi.mocked(auth).mockResolvedValue(mockSession)
    vi.mocked(markNotificationAsRead).mockResolvedValue(true)

    const response = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'notif-123' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(markNotificationAsRead).toHaveBeenCalledWith('notif-123', 'user-123')
  })

  it('returns 404 when notification not found', async () => {
    const mockSession = createMockSession()
    vi.mocked(auth).mockResolvedValue(mockSession)
    vi.mocked(markNotificationAsRead).mockResolvedValue(false)

    const response = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'non-existent' }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Notification not found')
  })
})

describe('POST /api/notifications/read-all', () => {
  let POST: () => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    const module = await import('../read-all/route')
    POST = module.POST
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('marks all notifications as read for authenticated user', async () => {
    const mockSession = createMockSession()
    vi.mocked(auth).mockResolvedValue(mockSession)
    vi.mocked(markAllNotificationsAsRead).mockResolvedValue(5)

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.markedCount).toBe(5)
    expect(markAllNotificationsAsRead).toHaveBeenCalledWith('user-123')
  })

  it('returns 0 count when no unread notifications', async () => {
    const mockSession = createMockSession()
    vi.mocked(auth).mockResolvedValue(mockSession)
    vi.mocked(markAllNotificationsAsRead).mockResolvedValue(0)

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.markedCount).toBe(0)
  })
})
