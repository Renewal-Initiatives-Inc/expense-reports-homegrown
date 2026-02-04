import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Notification } from '../../schema'

// Mock the database module
vi.mock('../..', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(),
          })),
          limit: vi.fn(),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
  },
}))

// Import after mocking
import { db } from '../..'
import {
  createNotification,
  getNotificationsForUser,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  notifyReportApproved,
  notifyReportRejected,
  notifyReportSubmitted,
} from '../notifications'

describe('notifications queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createNotification', () => {
    it('creates a notification with correct fields', async () => {
      const mockNotification: Notification = {
        id: 'notif-123',
        userId: 'user-123',
        type: 'report_approved',
        reportId: 'report-456',
        message: 'Your report was approved',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockReturning = vi.fn().mockResolvedValue([mockNotification])
      const mockValues = vi.fn(() => ({ returning: mockReturning }))
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never)

      const result = await createNotification({
        userId: 'user-123',
        type: 'report_approved',
        reportId: 'report-456',
        message: 'Your report was approved',
      })

      expect(result).toEqual(mockNotification)
      expect(db.insert).toHaveBeenCalled()
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          type: 'report_approved',
          reportId: 'report-456',
          message: 'Your report was approved',
          read: false,
        })
      )
    })
  })

  describe('getNotificationsForUser', () => {
    it('returns notifications in descending order', async () => {
      const mockNotifications: Notification[] = [
        {
          id: 'notif-2',
          userId: 'user-123',
          type: 'report_approved',
          reportId: 'report-2',
          message: 'Notification 2',
          read: false,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          id: 'notif-1',
          userId: 'user-123',
          type: 'report_rejected',
          reportId: 'report-1',
          message: 'Notification 1',
          read: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ]

      const mockLimit = vi.fn().mockResolvedValue(mockNotifications)
      const mockOrderBy = vi.fn(() => ({ limit: mockLimit }))
      const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }))
      const mockFrom = vi.fn(() => ({ where: mockWhere }))
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never)

      const result = await getNotificationsForUser('user-123')

      expect(result).toEqual(mockNotifications)
      expect(result[0].createdAt.getTime()).toBeGreaterThan(result[1].createdAt.getTime())
    })

    it('respects the limit parameter', async () => {
      const mockLimit = vi.fn().mockResolvedValue([])
      const mockOrderBy = vi.fn(() => ({ limit: mockLimit }))
      const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }))
      const mockFrom = vi.fn(() => ({ where: mockWhere }))
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never)

      await getNotificationsForUser('user-123', 10)

      expect(mockLimit).toHaveBeenCalledWith(10)
    })
  })

  describe('getUnreadNotificationCount', () => {
    it('returns correct count', async () => {
      const mockResult = [{ count: 5 }]

      const mockWhere = vi.fn().mockResolvedValue(mockResult)
      const mockFrom = vi.fn(() => ({ where: mockWhere }))
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never)

      const result = await getUnreadNotificationCount('user-123')

      expect(result).toBe(5)
    })

    it('returns 0 when no unread notifications', async () => {
      const mockResult = [{ count: 0 }]

      const mockWhere = vi.fn().mockResolvedValue(mockResult)
      const mockFrom = vi.fn(() => ({ where: mockWhere }))
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never)

      const result = await getUnreadNotificationCount('user-123')

      expect(result).toBe(0)
    })
  })

  describe('markNotificationAsRead', () => {
    it('returns true when notification is marked as read', async () => {
      const mockReturning = vi.fn().mockResolvedValue([{ id: 'notif-123' }])
      const mockWhere = vi.fn(() => ({ returning: mockReturning }))
      const mockSet = vi.fn(() => ({ where: mockWhere }))
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never)

      const result = await markNotificationAsRead('notif-123', 'user-123')

      expect(result).toBe(true)
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          read: true,
        })
      )
    })

    it('returns false when notification not found', async () => {
      const mockReturning = vi.fn().mockResolvedValue([])
      const mockWhere = vi.fn(() => ({ returning: mockReturning }))
      const mockSet = vi.fn(() => ({ where: mockWhere }))
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never)

      const result = await markNotificationAsRead('non-existent', 'user-123')

      expect(result).toBe(false)
    })
  })

  describe('markAllNotificationsAsRead', () => {
    it('returns count of marked notifications', async () => {
      const mockReturning = vi.fn().mockResolvedValue([{ id: '1' }, { id: '2' }, { id: '3' }])
      const mockWhere = vi.fn(() => ({ returning: mockReturning }))
      const mockSet = vi.fn(() => ({ where: mockWhere }))
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never)

      const result = await markAllNotificationsAsRead('user-123')

      expect(result).toBe(3)
    })

    it('returns 0 when no unread notifications', async () => {
      const mockReturning = vi.fn().mockResolvedValue([])
      const mockWhere = vi.fn(() => ({ returning: mockReturning }))
      const mockSet = vi.fn(() => ({ where: mockWhere }))
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never)

      const result = await markAllNotificationsAsRead('user-123')

      expect(result).toBe(0)
    })
  })

  describe('notifyReportApproved', () => {
    it('creates notification with correct message', async () => {
      const mockNotification: Notification = {
        id: 'notif-123',
        userId: 'user-123',
        type: 'report_approved',
        reportId: 'report-456',
        message: 'Your report "Q1 Expenses" has been approved',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockReturning = vi.fn().mockResolvedValue([mockNotification])
      const mockValues = vi.fn(() => ({ returning: mockReturning }))
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never)

      const result = await notifyReportApproved('user-123', 'report-456', 'Q1 Expenses')

      expect(result.type).toBe('report_approved')
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'report_approved',
          message: expect.stringContaining('Q1 Expenses'),
        })
      )
    })

    it('includes comment preview when provided', async () => {
      const mockNotification: Notification = {
        id: 'notif-123',
        userId: 'user-123',
        type: 'report_approved',
        reportId: 'report-456',
        message: 'Your report "Q1 Expenses" has been approved: Great work!',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockReturning = vi.fn().mockResolvedValue([mockNotification])
      const mockValues = vi.fn(() => ({ returning: mockReturning }))
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never)

      await notifyReportApproved('user-123', 'report-456', 'Q1 Expenses', 'Great work!')

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Great work!'),
        })
      )
    })
  })

  describe('notifyReportRejected', () => {
    it('creates notification with rejection comment', async () => {
      const mockNotification: Notification = {
        id: 'notif-123',
        userId: 'user-123',
        type: 'report_rejected',
        reportId: 'report-456',
        message: 'Your report "Q1 Expenses" was returned: Missing receipts',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockReturning = vi.fn().mockResolvedValue([mockNotification])
      const mockValues = vi.fn(() => ({ returning: mockReturning }))
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never)

      const result = await notifyReportRejected('user-123', 'report-456', 'Q1 Expenses', 'Missing receipts')

      expect(result.type).toBe('report_rejected')
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'report_rejected',
          message: expect.stringContaining('Missing receipts'),
        })
      )
    })

    it('truncates long rejection comments', async () => {
      const longComment = 'A'.repeat(150)
      const mockNotification: Notification = {
        id: 'notif-123',
        userId: 'user-123',
        type: 'report_rejected',
        reportId: 'report-456',
        message: `Your report "Q1 Expenses" was returned: ${'A'.repeat(100)}...`,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockReturning = vi.fn().mockResolvedValue([mockNotification])
      const mockValues = vi.fn(() => ({ returning: mockReturning }))
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never)

      await notifyReportRejected('user-123', 'report-456', 'Q1 Expenses', longComment)

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('...'),
        })
      )
    })
  })

  describe('notifyReportSubmitted', () => {
    it('creates notifications for all admins', async () => {
      const mockNotification: Notification = {
        id: 'notif-123',
        userId: 'admin-1',
        type: 'report_submitted',
        reportId: 'report-456',
        message: 'John Doe submitted "Q1 Expenses" for approval',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockReturning = vi.fn().mockResolvedValue([mockNotification])
      const mockValues = vi.fn(() => ({ returning: mockReturning }))
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never)

      const adminIds = ['admin-1', 'admin-2', 'admin-3']
      const results = await notifyReportSubmitted(adminIds, 'report-456', 'Q1 Expenses', 'John Doe')

      expect(results).toHaveLength(3)
      expect(db.insert).toHaveBeenCalledTimes(3)
    })

    it('returns empty array when no admins', async () => {
      const results = await notifyReportSubmitted([], 'report-456', 'Q1 Expenses', 'John Doe')

      expect(results).toHaveLength(0)
      expect(db.insert).not.toHaveBeenCalled()
    })

    it('creates notification with submitter name', async () => {
      const mockNotification: Notification = {
        id: 'notif-123',
        userId: 'admin-1',
        type: 'report_submitted',
        reportId: 'report-456',
        message: 'Jane Smith submitted "March Expenses" for approval',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockReturning = vi.fn().mockResolvedValue([mockNotification])
      const mockValues = vi.fn(() => ({ returning: mockReturning }))
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never)

      await notifyReportSubmitted(['admin-1'], 'report-456', 'March Expenses', 'Jane Smith')

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'report_submitted',
          message: expect.stringContaining('Jane Smith'),
        })
      )
    })
  })
})
