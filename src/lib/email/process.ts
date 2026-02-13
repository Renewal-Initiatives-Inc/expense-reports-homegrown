import { isAnthropicConfigured } from '@/lib/anthropic'
import { uploadEmailAttachment, uploadEmailHtml } from '@/lib/blob'
import { EXPENSE_CATEGORIES } from '@/lib/categories'
import { checkDuplicateExpense, createEmailExpense, getExpenseByEmailMessageId } from '@/lib/db/queries/expenses'
import { createNotification } from '@/lib/db/queries/notifications'
import { getCachedData } from '@/lib/db/queries/qbo-cache'
import { findOrCreateEmailedReceiptsReport } from '@/lib/db/queries/reports'
import { getUserByAnyEmail } from '@/lib/db/queries/users'
import { processReceiptImage, processReceiptText } from '@/lib/receipt-extraction'
import type { QboCategory } from '@/lib/qbo/types'
import { getReceiptAttachments, parseMimeEmail } from './parse'

export type ProcessResult =
  | { status: 'skipped_duplicate_message'; messageId: string }
  | { status: 'sender_unrecognized'; sender: string }
  | { status: 'expense_created'; expenseId: string; reportId: string }
  | { status: 'expense_created_no_extraction'; expenseId: string; reportId: string }

/**
 * Process an inbound email end-to-end: parse MIME, verify sender,
 * extract receipt data, and create expense.
 *
 * Follows EP2: "Always Create, Never Block" — errors in extraction
 * or upload are caught and the expense is still created.
 */
export async function processInboundEmail(
  rawEmail: string,
  sesMessageId: string
): Promise<ProcessResult> {
  // 1. Parse MIME
  const parsed = await parseMimeEmail(rawEmail)

  // 2. Idempotency — skip if already processed
  const existing = await getExpenseByEmailMessageId(sesMessageId)
  if (existing) {
    return { status: 'skipped_duplicate_message', messageId: sesMessageId }
  }

  // 3. Sender verification
  if (!parsed.from) {
    return { status: 'sender_unrecognized', sender: '(no sender)' }
  }

  const user = await getUserByAnyEmail(parsed.from)
  if (!user) {
    return { status: 'sender_unrecognized', sender: parsed.from }
  }

  // 4. Upload receipt (attachment, or HTML body as fallback)
  const receiptAttachments = getReceiptAttachments(parsed.attachments)
  let receiptUrl: string | null = null
  let receiptThumbnailUrl: string | null = null
  let receiptMimeType: string | null = null
  let emailBodyContent: string | null = null
  let emailBodyFormat: 'html' | 'text' | null = null

  if (receiptAttachments.length > 0) {
    // Case 1: File attachment (image or PDF)
    const firstAttachment = receiptAttachments[0]
    try {
      const uploadResult = await uploadEmailAttachment(
        firstAttachment.content,
        firstAttachment.filename || 'receipt',
        firstAttachment.mimeType
      )
      receiptUrl = uploadResult.url
      receiptThumbnailUrl = uploadResult.thumbnailUrl
      receiptMimeType = firstAttachment.mimeType
    } catch (error) {
      console.error('[email/process] Failed to upload attachment:', error)
    }
  } else if (parsed.html) {
    // Case 2: HTML email body (forwarded receipt with no attachment)
    emailBodyContent = parsed.html
    emailBodyFormat = 'html'
    try {
      const uploadResult = await uploadEmailHtml(parsed.html)
      receiptUrl = uploadResult.url
      receiptThumbnailUrl = uploadResult.thumbnailUrl
    } catch (error) {
      console.error('[email/process] Failed to upload HTML receipt:', error)
    }
  } else if (parsed.text) {
    // Case 3: Plain text email body
    emailBodyContent = parsed.text
    emailBodyFormat = 'text'
  }

  // 5. Extract receipt data (attachments, HTML, or text)
  let extractedData: {
    merchant: string | null
    amount: string | null
    date: string | null
    categoryId: string | null
    categoryName: string | null
    memo: string | null
    confidence: Record<string, number> | null
  } = {
    merchant: null,
    amount: null,
    date: null,
    categoryId: null,
    categoryName: null,
    memo: null,
    confidence: null,
  }

  let didExtract = false

  if (isAnthropicConfigured()) {
    try {
      const categories = await getAvailableCategories()

      if (receiptUrl && receiptMimeType) {
        // Extract from image/PDF attachment
        const result = await processReceiptImage(receiptUrl, categories, receiptMimeType)
        extractedData = {
          merchant: result.merchant,
          amount: result.amount,
          date: result.date,
          categoryId: result.suggestedCategoryId,
          categoryName: result.suggestedCategoryName,
          memo: result.memo,
          confidence: result.confidence,
        }
        didExtract = true
      } else if (emailBodyContent && emailBodyFormat) {
        // Extract from HTML or plain text email body
        const result = await processReceiptText(emailBodyContent, categories, emailBodyFormat)
        extractedData = {
          merchant: result.merchant,
          amount: result.amount,
          date: result.date,
          categoryId: result.suggestedCategoryId,
          categoryName: result.suggestedCategoryName,
          memo: result.memo,
          confidence: result.confidence,
        }
        didExtract = true
      }
    } catch (error) {
      console.error('[email/process] Failed to extract receipt data:', error)
    }
  }

  // 6. Find/create report
  const report = await findOrCreateEmailedReceiptsReport(user.id)

  // 7. Duplicate detection (informational only — still creates expense)
  const today = new Date().toISOString().split('T')[0]
  const expenseAmount = extractedData.amount || '0.00'
  const expenseDate = extractedData.date || today
  const duplicateFlag = await checkDuplicateExpense(
    user.id,
    expenseAmount,
    extractedData.merchant,
    expenseDate
  )

  // 8. Create expense
  const expense = await createEmailExpense(report.id, user.id, {
    type: 'out_of_pocket',
    amount: expenseAmount,
    date: expenseDate,
    merchant: extractedData.merchant,
    memo: extractedData.memo || parsed.subject || null,
    categoryId: extractedData.categoryId,
    categoryName: extractedData.categoryName,
    receiptUrl,
    receiptThumbnailUrl,
    aiConfidence: extractedData.confidence,
    emailReceivedAt: parsed.date || new Date(),
    emailMessageId: sesMessageId,
    duplicateFlag,
  })

  // 9. Notification
  try {
    await createNotification({
      userId: user.id,
      type: 'email_receipt_processed',
      reportId: report.id,
      message: extractedData.merchant
        ? `Receipt from ${extractedData.merchant} ($${expenseAmount}) added to "${report.name}"`
        : `Email receipt added to "${report.name}"`,
    })
  } catch (error) {
    console.error('[email/process] Failed to create notification:', error)
  }

  return {
    status: didExtract ? 'expense_created' : 'expense_created_no_extraction',
    expenseId: expense.id,
    reportId: report.id,
  }
}

/**
 * Get available categories for receipt extraction.
 * Tries QBO cache first, falls back to hardcoded defaults.
 */
async function getAvailableCategories(): Promise<{ id: string; name: string }[]> {
  try {
    const cached = await getCachedData<QboCategory[]>('categories')
    if (cached && cached.length > 0) {
      return cached.map((c) => ({ id: c.id, name: c.name }))
    }
  } catch {
    // Fall through to defaults
  }

  return EXPENSE_CATEGORIES.map((c) => ({ id: c.id, name: c.name }))
}
