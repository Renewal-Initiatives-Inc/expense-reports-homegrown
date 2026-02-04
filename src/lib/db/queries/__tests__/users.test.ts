import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '../../schema'

// Mock the database module
vi.mock('../..', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn(() => ({
          returning: vi.fn(),
        })),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(),
        })),
      })),
    })),
  },
}))

// Import after mocking
import { db } from '../..'
import { getAdminUserIds, getUserById, upsertUser } from '../users'

describe('users queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('upsertUser', () => {
    it('inserts a new user and returns it', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockReturning = vi.fn().mockResolvedValue([mockUser])
      const mockOnConflictDoUpdate = vi.fn(() => ({ returning: mockReturning }))
      const mockValues = vi.fn(() => ({ onConflictDoUpdate: mockOnConflictDoUpdate }))
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never)

      const result = await upsertUser({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      })

      expect(result).toEqual(mockUser)
      expect(db.insert).toHaveBeenCalled()
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
        })
      )
    })

    it('updates an existing user on conflict', async () => {
      const existingUser: User = {
        id: 'user-123',
        email: 'updated@example.com',
        name: 'Updated User',
        role: 'admin',
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockReturning = vi.fn().mockResolvedValue([existingUser])
      const mockOnConflictDoUpdate = vi.fn(() => ({ returning: mockReturning }))
      const mockValues = vi.fn(() => ({ onConflictDoUpdate: mockOnConflictDoUpdate }))
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never)

      const result = await upsertUser({
        id: 'user-123',
        email: 'updated@example.com',
        name: 'Updated User',
        role: 'admin',
      })

      expect(result).toEqual(existingUser)
      expect(mockOnConflictDoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          set: expect.objectContaining({
            email: 'updated@example.com',
            name: 'Updated User',
            role: 'admin',
          }),
        })
      )
    })
  })

  describe('getAdminUserIds', () => {
    it('returns empty array when no admins exist', async () => {
      const mockWhere = vi.fn().mockResolvedValue([])
      const mockFrom = vi.fn(() => ({ where: mockWhere }))
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never)

      const result = await getAdminUserIds()

      expect(result).toEqual([])
    })

    it('returns array of admin user IDs', async () => {
      const adminUsers = [{ id: 'admin-1' }, { id: 'admin-2' }]

      const mockWhere = vi.fn().mockResolvedValue(adminUsers)
      const mockFrom = vi.fn(() => ({ where: mockWhere }))
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never)

      const result = await getAdminUserIds()

      expect(result).toEqual(['admin-1', 'admin-2'])
    })
  })

  describe('getUserById', () => {
    it('returns user when found', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockLimit = vi.fn().mockResolvedValue([mockUser])
      const mockWhere = vi.fn(() => ({ limit: mockLimit }))
      const mockFrom = vi.fn(() => ({ where: mockWhere }))
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never)

      const result = await getUserById('user-123')

      expect(result).toEqual(mockUser)
    })

    it('returns undefined when user not found', async () => {
      const mockLimit = vi.fn().mockResolvedValue([])
      const mockWhere = vi.fn(() => ({ limit: mockLimit }))
      const mockFrom = vi.fn(() => ({ where: mockWhere }))
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never)

      const result = await getUserById('non-existent')

      expect(result).toBeUndefined()
    })
  })
})
