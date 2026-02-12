import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the email utilities
vi.mock('@/lib/email', () => ({
  verifySnsMessage: vi.fn(),
  confirmSnsSubscription: vi.fn(),
  parseSnsNotification: vi.fn(),
  fetchEmailFromS3: vi.fn(),
}))

import { confirmSnsSubscription, fetchEmailFromS3, parseSnsNotification, verifySnsMessage } from '@/lib/email'
import { POST } from '../route'

function createRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/email/inbound', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/email/inbound', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects malformed request body with 400', async () => {
    const request = new Request('http://localhost:3000/api/email/inbound', {
      method: 'POST',
      body: 'not-valid-json{{{',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid request body')
  })

  it('rejects request with invalid SNS signature with 401', async () => {
    vi.mocked(verifySnsMessage).mockResolvedValue(false)

    const request = createRequest({ Type: 'Notification', Message: 'test' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Invalid signature')
  })

  describe('SubscriptionConfirmation', () => {
    it('confirms subscription and returns 200', async () => {
      vi.mocked(verifySnsMessage).mockResolvedValue(true)
      vi.mocked(confirmSnsSubscription).mockResolvedValue(undefined)

      const request = createRequest({
        Type: 'SubscriptionConfirmation',
        SubscribeURL: 'https://sns.us-east-1.amazonaws.com/confirm?token=abc',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('subscription_confirmed')
      expect(confirmSnsSubscription).toHaveBeenCalledWith('https://sns.us-east-1.amazonaws.com/confirm?token=abc')
    })

    it('returns 400 when SubscribeURL is missing', async () => {
      vi.mocked(verifySnsMessage).mockResolvedValue(true)

      const request = createRequest({ Type: 'SubscriptionConfirmation' })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('returns 500 when subscription confirmation fails', async () => {
      vi.mocked(verifySnsMessage).mockResolvedValue(true)
      vi.mocked(confirmSnsSubscription).mockRejectedValue(new Error('Network error'))

      const request = createRequest({
        Type: 'SubscriptionConfirmation',
        SubscribeURL: 'https://sns.us-east-1.amazonaws.com/confirm?token=abc',
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })
  })

  describe('UnsubscribeConfirmation', () => {
    it('acknowledges unsubscription and returns 200', async () => {
      vi.mocked(verifySnsMessage).mockResolvedValue(true)

      const request = createRequest({ Type: 'UnsubscribeConfirmation' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('unsubscribe_confirmed')
    })
  })

  describe('Notification', () => {
    const validSesNotification = {
      bucket: 'renewal-expense-emails',
      key: 'incoming/abc123',
      messageId: 'msg-001',
    }

    it('processes valid email notification and returns 200', async () => {
      vi.mocked(verifySnsMessage).mockResolvedValue(true)
      vi.mocked(parseSnsNotification).mockReturnValue(validSesNotification)
      vi.mocked(fetchEmailFromS3).mockResolvedValue('From: sender@example.com\nSubject: Receipt\n\nBody')

      const request = createRequest({
        Type: 'Notification',
        Message: JSON.stringify({
          receipt: { action: { bucketName: 'renewal-expense-emails', objectKey: 'incoming/abc123' } },
          mail: { messageId: 'msg-001' },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('received')
      expect(data.messageId).toBe('msg-001')
      expect(fetchEmailFromS3).toHaveBeenCalledWith('renewal-expense-emails', 'incoming/abc123')
    })

    it('returns 400 when SES notification cannot be parsed', async () => {
      vi.mocked(verifySnsMessage).mockResolvedValue(true)
      vi.mocked(parseSnsNotification).mockReturnValue(null)

      const request = createRequest({
        Type: 'Notification',
        Message: 'invalid',
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('returns 500 when S3 fetch fails', async () => {
      vi.mocked(verifySnsMessage).mockResolvedValue(true)
      vi.mocked(parseSnsNotification).mockReturnValue(validSesNotification)
      vi.mocked(fetchEmailFromS3).mockRejectedValue(new Error('NoSuchKey'))

      const request = createRequest({
        Type: 'Notification',
        Message: JSON.stringify({
          receipt: { action: { bucketName: 'bucket', objectKey: 'key' } },
          mail: { messageId: 'msg-001' },
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })
  })

  it('returns 400 for unknown message type', async () => {
    vi.mocked(verifySnsMessage).mockResolvedValue(true)

    const request = createRequest({ Type: 'SomeUnknownType' })
    const response = await POST(request)

    expect(response.status).toBe(400)
  })
})
