// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { getReceiptAttachments, parseMimeEmail } from '../parse'

const MINIMAL_MIME = [
  'From: John Doe <john@example.com>',
  'To: receipts@inbound.renewalinitiatives.org',
  'Subject: Lunch receipt',
  'Date: Wed, 12 Feb 2026 10:30:00 -0500',
  'Message-ID: <abc123@mail.example.com>',
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=utf-8',
  '',
  'Here is my receipt.',
].join('\r\n')

const MIME_WITH_ATTACHMENT = [
  'From: Jane Smith <jane@example.com>',
  'To: receipts@inbound.renewalinitiatives.org',
  'Subject: Dinner receipt',
  'Date: Wed, 12 Feb 2026 18:00:00 -0500',
  'Message-ID: <def456@mail.example.com>',
  'MIME-Version: 1.0',
  'Content-Type: multipart/mixed; boundary="----=_Part_001"',
  '',
  '------=_Part_001',
  'Content-Type: text/plain; charset=utf-8',
  '',
  'Receipt attached.',
  '',
  '------=_Part_001',
  'Content-Type: image/jpeg; name="receipt.jpg"',
  'Content-Disposition: attachment; filename="receipt.jpg"',
  'Content-Transfer-Encoding: base64',
  '',
  // Minimal valid JPEG (SOI + EOI markers)
  '/9j/4AAQSkZJRg==',
  '',
  '------=_Part_001--',
].join('\r\n')

describe('parseMimeEmail', () => {
  it('extracts sender, subject, and body from plain text email', async () => {
    const result = await parseMimeEmail(MINIMAL_MIME)

    expect(result.from).toBe('john@example.com')
    expect(result.fromName).toBe('John Doe')
    expect(result.subject).toBe('Lunch receipt')
    expect(result.text).toContain('Here is my receipt.')
    expect(result.messageId).toBe('<abc123@mail.example.com>')
    expect(result.date).toBeInstanceOf(Date)
    expect(result.attachments).toHaveLength(0)
  })

  it('extracts attachments from multipart email', async () => {
    const result = await parseMimeEmail(MIME_WITH_ATTACHMENT)

    expect(result.from).toBe('jane@example.com')
    expect(result.fromName).toBe('Jane Smith')
    expect(result.subject).toBe('Dinner receipt')
    expect(result.attachments.length).toBeGreaterThanOrEqual(1)

    const imageAtt = result.attachments.find((a) => a.mimeType === 'image/jpeg')
    expect(imageAtt).toBeDefined()
    expect(imageAtt!.filename).toBe('receipt.jpg')
    expect(imageAtt!.content).toBeInstanceOf(ArrayBuffer)
  })

  it('handles email with no from address gracefully', async () => {
    const noFrom = ['Subject: Test', 'MIME-Version: 1.0', 'Content-Type: text/plain', '', 'body'].join('\r\n')

    const result = await parseMimeEmail(noFrom)

    expect(result.from).toBeNull()
    expect(result.fromName).toBeNull()
  })
})

describe('getReceiptAttachments', () => {
  it('filters to only receipt-compatible MIME types', () => {
    const attachments = [
      { filename: 'receipt.jpg', mimeType: 'image/jpeg', content: new ArrayBuffer(0), disposition: 'attachment', contentId: null },
      { filename: 'notes.txt', mimeType: 'text/plain', content: new ArrayBuffer(0), disposition: 'attachment', contentId: null },
      { filename: 'receipt.pdf', mimeType: 'application/pdf', content: new ArrayBuffer(0), disposition: 'attachment', contentId: null },
      { filename: 'doc.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', content: new ArrayBuffer(0), disposition: 'attachment', contentId: null },
      { filename: 'photo.png', mimeType: 'image/png', content: new ArrayBuffer(0), disposition: 'attachment', contentId: null },
    ]

    const result = getReceiptAttachments(attachments)

    expect(result).toHaveLength(3)
    expect(result.map((a) => a.mimeType)).toEqual(['image/jpeg', 'application/pdf', 'image/png'])
  })

  it('returns empty array when no receipt attachments', () => {
    const attachments = [
      { filename: 'notes.txt', mimeType: 'text/plain', content: new ArrayBuffer(0), disposition: 'attachment', contentId: null },
    ]

    expect(getReceiptAttachments(attachments)).toHaveLength(0)
  })
})
