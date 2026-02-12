import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockValidate } = vi.hoisted(() => ({
  mockValidate: vi.fn(),
}))

// Mock sns-validator — must return a class-like constructor
vi.mock('sns-validator', () => {
  return {
    default: class MockMessageValidator {
      validate = mockValidate
    },
  }
})

import { confirmSnsSubscription, parseSnsNotification, verifySnsMessage } from '../sns'

describe('SNS utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('verifySnsMessage', () => {
    it('returns true for valid SNS signature', async () => {
      mockValidate.mockImplementation((_hash: unknown, cb: (err: Error | null) => void) => {
        cb(null)
      })

      const message = { Type: 'Notification', Message: 'test' }
      const result = await verifySnsMessage(message)

      expect(result).toBe(true)
      expect(mockValidate).toHaveBeenCalled()
    })

    it('returns false for invalid SNS signature', async () => {
      mockValidate.mockImplementation((_hash: unknown, cb: (err: Error | null) => void) => {
        cb(new Error('Invalid signature'))
      })

      const message = { Type: 'Notification', Message: 'test' }
      const result = await verifySnsMessage(message)

      expect(result).toBe(false)
    })
  })

  describe('parseSnsNotification', () => {
    it('extracts S3 bucket, key, and messageId from valid SES notification', () => {
      const snsMessage = {
        Type: 'Notification',
        Message: JSON.stringify({
          receipt: {
            action: {
              type: 'S3',
              bucketName: 'renewal-expense-emails',
              objectKey: 'incoming/abc123',
            },
          },
          mail: {
            messageId: 'msg-001',
            source: 'sender@example.com',
            timestamp: '2026-02-11T12:00:00Z',
          },
        }),
      }

      const result = parseSnsNotification(snsMessage)

      expect(result).toEqual({
        bucket: 'renewal-expense-emails',
        key: 'incoming/abc123',
        messageId: 'msg-001',
      })
    })

    it('returns null for missing Message field', () => {
      const result = parseSnsNotification({ Type: 'Notification' })
      expect(result).toBeNull()
    })

    it('returns null for non-string Message field', () => {
      const result = parseSnsNotification({ Type: 'Notification', Message: 12345 })
      expect(result).toBeNull()
    })

    it('returns null for malformed JSON in Message', () => {
      const result = parseSnsNotification({ Type: 'Notification', Message: 'not-json' })
      expect(result).toBeNull()
    })

    it('returns null when receipt.action.bucketName is missing', () => {
      const snsMessage = {
        Type: 'Notification',
        Message: JSON.stringify({
          receipt: { action: { objectKey: 'incoming/abc123' } },
          mail: { messageId: 'msg-001' },
        }),
      }

      const result = parseSnsNotification(snsMessage)
      expect(result).toBeNull()
    })

    it('returns null when receipt.action.objectKey is missing', () => {
      const snsMessage = {
        Type: 'Notification',
        Message: JSON.stringify({
          receipt: { action: { bucketName: 'bucket' } },
          mail: { messageId: 'msg-001' },
        }),
      }

      const result = parseSnsNotification(snsMessage)
      expect(result).toBeNull()
    })

    it('returns null when mail.messageId is missing', () => {
      const snsMessage = {
        Type: 'Notification',
        Message: JSON.stringify({
          receipt: { action: { bucketName: 'bucket', objectKey: 'key' } },
          mail: {},
        }),
      }

      const result = parseSnsNotification(snsMessage)
      expect(result).toBeNull()
    })
  })

  describe('confirmSnsSubscription', () => {
    it('fetches the SubscribeURL', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true })
      vi.stubGlobal('fetch', mockFetch)

      await confirmSnsSubscription('https://sns.us-east-1.amazonaws.com/confirm?token=abc')

      expect(mockFetch).toHaveBeenCalledWith('https://sns.us-east-1.amazonaws.com/confirm?token=abc')
    })

    it('throws when SubscribeURL fetch fails', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })
      vi.stubGlobal('fetch', mockFetch)

      await expect(confirmSnsSubscription('https://sns.us-east-1.amazonaws.com/confirm?token=abc')).rejects.toThrow(
        'Failed to confirm SNS subscription: 500'
      )
    })
  })
})
