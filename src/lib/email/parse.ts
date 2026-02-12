import PostalMime from 'postal-mime'

export interface ParsedEmail {
  messageId: string | null
  from: string | null
  fromName: string | null
  subject: string | null
  date: Date | null
  html: string | null
  text: string | null
  attachments: ParsedAttachment[]
}

export interface ParsedAttachment {
  filename: string | null
  mimeType: string
  content: ArrayBuffer
  disposition: string | null
  contentId: string | null
}

const RECEIPT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'application/pdf',
]

/**
 * Parse a raw MIME email string into structured data.
 */
export async function parseMimeEmail(rawEmail: string): Promise<ParsedEmail> {
  const parser = new PostalMime()
  const parsed = await parser.parse(rawEmail)

  return {
    messageId: parsed.messageId || null,
    from: parsed.from?.address || null,
    fromName: parsed.from?.name || null,
    subject: parsed.subject || null,
    date: parsed.date ? new Date(parsed.date) : null,
    html: parsed.html || null,
    text: parsed.text || null,
    attachments: (parsed.attachments || []).map((att) => ({
      filename: att.filename || null,
      mimeType: att.mimeType,
      content: typeof att.content === 'string'
        ? new TextEncoder().encode(att.content).buffer as ArrayBuffer
        : att.content,
      disposition: att.disposition || null,
      contentId: att.contentId || null,
    })),
  }
}

/**
 * Filter attachments to only receipt-compatible types (images + PDF).
 */
export function getReceiptAttachments(attachments: ParsedAttachment[]): ParsedAttachment[] {
  return attachments.filter((att) => RECEIPT_MIME_TYPES.includes(att.mimeType))
}
