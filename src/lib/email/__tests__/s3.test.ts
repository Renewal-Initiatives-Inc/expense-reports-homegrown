import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSend = vi.fn()

// Mock the AWS S3 client with a proper class constructor
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class MockS3Client {
    send = mockSend
  },
  GetObjectCommand: class MockGetObjectCommand {
    constructor(public input: { Bucket: string; Key: string }) {}
  },
}))

// Re-import after mock to get a fresh module with the mock applied
// We need to reset the singleton between tests
let fetchEmailFromS3: typeof import('../s3').fetchEmailFromS3

describe('S3 utilities', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Reset module to clear the singleton S3 client
    vi.resetModules()
    const mod = await import('../s3')
    fetchEmailFromS3 = mod.fetchEmailFromS3
  })

  describe('fetchEmailFromS3', () => {
    it('returns email content from S3', async () => {
      const rawEmail =
        'From: sender@example.com\nTo: receipts@expenses.renewalinitiatives.org\nSubject: Receipt\n\nBody'

      mockSend.mockResolvedValue({
        Body: {
          transformToString: vi.fn().mockResolvedValue(rawEmail),
        },
      })

      const result = await fetchEmailFromS3('renewal-expense-emails', 'incoming/abc123')

      expect(result).toBe(rawEmail)
      expect(mockSend).toHaveBeenCalledTimes(1)
    })

    it('throws when S3 response body is empty', async () => {
      mockSend.mockResolvedValue({ Body: null })

      await expect(fetchEmailFromS3('bucket', 'key')).rejects.toThrow('Empty response body')
    })

    it('throws on S3 NoSuchKey error', async () => {
      const error = new Error('The specified key does not exist.')
      error.name = 'NoSuchKey'
      mockSend.mockRejectedValue(error)

      await expect(fetchEmailFromS3('bucket', 'nonexistent-key')).rejects.toThrow(
        'The specified key does not exist.'
      )
    })

    it('throws on S3 AccessDenied error', async () => {
      const error = new Error('Access Denied')
      error.name = 'AccessDenied'
      mockSend.mockRejectedValue(error)

      await expect(fetchEmailFromS3('bucket', 'forbidden-key')).rejects.toThrow('Access Denied')
    })
  })
})
