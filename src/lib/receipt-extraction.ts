/**
 * Receipt extraction utilities for category matching and result normalization.
 */

import Anthropic from '@anthropic-ai/sdk'

import {
  createAnthropicClient,
  mapConfidence,
  parseExtractionResponse,
  PROCESSING_TIMEOUT_MS,
  RECEIPT_EXTRACTION_PROMPT,
  RECEIPT_MODEL,
  AnthropicError,
  type ReceiptExtractionResponse,
} from './anthropic'

/**
 * Category synonyms for fuzzy matching.
 * Maps QBO-style category names to related terms that Claude might return.
 */
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  'property taxes': ['tax', 'pilot', 'assessment'],
  'property insurance': ['insurance', 'liability', 'coverage', 'premium'],
  'management fees': ['management', 'property management'],
  commissions: ['broker', 'placement', 'commission', 'leasing'],
  'landscaping & grounds': ['landscaping', 'snow', 'mowing', 'grounds', 'lawn', 'plowing'],
  'repairs & maintenance': ['repair', 'maintenance', 'plumbing', 'hvac', 'electrical', 'fix', 'turnover'],
  'utilities - electric': ['electric', 'electricity', 'power'],
  'utilities - gas': ['gas', 'natural gas', 'heating'],
  'utilities - water/sewer': ['water', 'sewer', 'municipal'],
  'utilities - internet': ['internet', 'wifi', 'broadband', 'cable'],
  'utilities - security & fire monitoring': ['security', 'fire', 'alarm', 'monitoring'],
  'utilities - trash': ['trash', 'waste', 'garbage', 'disposal', 'recycling'],
  'salaries & wages': ['salary', 'wage', 'payroll', 'labor'],
  travel: ['transportation', 'flight', 'airline', 'airfare', 'hotel', 'lodging', 'taxi', 'uber', 'lyft', 'train'],
  'meals and entertainment': ['food', 'restaurant', 'dining', 'lunch', 'dinner', 'breakfast', 'cafe', 'coffee', 'entertainment', 'takeout'],
  'auto and truck expenses': ['gas', 'fuel', 'gasoline', 'car', 'vehicle', 'automotive', 'parking', 'toll', 'mileage'],
  'office supplies': ['supplies', 'stationery', 'office', 'paper', 'pens', 'desk', 'printer'],
  equipment: ['hardware', 'computer', 'electronics', 'machinery', 'tools', 'appliance'],
  'professional services': ['consulting', 'legal', 'accounting', 'contractor', 'architecture', 'permitting'],
  'software and subscriptions': ['subscription', 'saas', 'software', 'app', 'technology', 'api'],
  'construction in progress': ['construction', 'renovation', 'development', 'acquisition', 'building'],
  'other operating costs': ['other', 'miscellaneous', 'misc', 'general'],
}

interface Category {
  id: string
  name: string
}

interface CategoryMatch {
  id: string
  name: string
  confidence: number
}

/**
 * Match a category hint from Claude to available categories.
 * Uses fuzzy matching with synonym expansion.
 */
export function matchCategory(
  categoryHint: string | null,
  availableCategories: Category[],
  baseConfidence: number
): CategoryMatch | null {
  if (!categoryHint || availableCategories.length === 0) {
    return null
  }

  const hint = categoryHint.toLowerCase().trim()

  // First try: exact match (case-insensitive)
  for (const category of availableCategories) {
    if (category.name.toLowerCase() === hint) {
      return {
        id: category.id,
        name: category.name,
        confidence: baseConfidence,
      }
    }
  }

  // Second try: contains match
  for (const category of availableCategories) {
    const catName = category.name.toLowerCase()
    if (catName.includes(hint) || hint.includes(catName)) {
      return {
        id: category.id,
        name: category.name,
        confidence: Math.max(0.5, baseConfidence - 0.1),
      }
    }
  }

  // Third try: synonym matching
  for (const category of availableCategories) {
    const catName = category.name.toLowerCase()

    // Check if any synonym matches the hint
    for (const [synonymKey, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
      // If category name matches a synonym key
      if (catName.includes(synonymKey) || synonymKey.includes(catName)) {
        if (synonyms.some((s) => hint.includes(s) || s.includes(hint))) {
          return {
            id: category.id,
            name: category.name,
            confidence: Math.max(0.4, baseConfidence - 0.2),
          }
        }
      }
    }
  }

  // No match found
  return null
}

/**
 * Normalized result from receipt extraction.
 */
export interface ReceiptExtractionResult {
  merchant: string | null
  amount: string | null
  date: string | null
  suggestedCategoryId: string | null
  suggestedCategoryName: string | null
  memo: string | null
  confidence: {
    merchant: number
    amount: number
    date: number
    category: number
  }
}

/**
 * Convert raw Claude response to normalized extraction result.
 */
export function normalizeExtractionResult(
  response: ReceiptExtractionResponse,
  availableCategories: Category[]
): ReceiptExtractionResult {
  // Map confidence levels to numbers
  const merchantConfidence = mapConfidence(response.merchant.confidence)
  const amountConfidence = mapConfidence(response.amount.confidence)
  const dateConfidence = mapConfidence(response.date.confidence)
  const categoryHintConfidence = mapConfidence(response.category_hint.confidence)

  // Match category
  const categoryMatch = matchCategory(response.category_hint.value, availableCategories, categoryHintConfidence)

  // Normalize amount to decimal string
  let normalizedAmount: string | null = null
  if (response.amount.value !== null) {
    const parsed = parseFloat(String(response.amount.value))
    if (!isNaN(parsed) && parsed > 0) {
      normalizedAmount = parsed.toFixed(2)
    }
  }

  // Normalize date to YYYY-MM-DD
  let normalizedDate: string | null = null
  if (response.date.value !== null) {
    // Try to parse various date formats
    const dateStr = String(response.date.value)
    // If already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      normalizedDate = dateStr
    } else {
      // Try to parse other formats
      const parsed = new Date(dateStr)
      if (!isNaN(parsed.getTime())) {
        normalizedDate = parsed.toISOString().split('T')[0]
      }
    }
  }

  return {
    merchant: response.merchant.value,
    amount: normalizedAmount,
    date: normalizedDate,
    suggestedCategoryId: categoryMatch?.id ?? null,
    suggestedCategoryName: categoryMatch?.name ?? null,
    memo: response.notes,
    confidence: {
      merchant: merchantConfidence,
      amount: amountConfidence,
      date: dateConfidence,
      category: categoryMatch?.confidence ?? 0.3,
    },
  }
}

/**
 * Process a receipt image or PDF using Claude Vision.
 * Returns extracted data with confidence scores.
 */
export async function processReceiptImage(
  imageUrl: string,
  availableCategories: Category[],
  mimeType?: string
): Promise<ReceiptExtractionResult> {
  const client = createAnthropicClient()

  // Fetch receipt and convert to base64
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PROCESSING_TIMEOUT_MS)

  try {
    const response = await fetch(imageUrl, { signal: controller.signal })
    if (!response.ok) {
      throw new AnthropicError(`Failed to fetch receipt: ${response.status}`, 'UNREADABLE')
    }

    const buffer = await response.arrayBuffer()
    const base64Data = Buffer.from(buffer).toString('base64')

    // Determine media type from explicit param, response header, or URL extension
    const contentType = mimeType || response.headers.get('content-type') || 'image/jpeg'
    const mediaType = contentType.split(';')[0].trim()
    const isPdf = mediaType === 'application/pdf'

    // Build the content block: document for PDFs, image for everything else
    const contentBlock: Anthropic.Messages.ContentBlockParam = isPdf
      ? {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64Data,
          },
        }
      : {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: base64Data,
          },
        }

    // Call Claude
    const apiResponse = await client.messages.create({
      model: RECEIPT_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            contentBlock,
            {
              type: 'text',
              text: RECEIPT_EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    })

    // Extract text content
    const textContent = apiResponse.content.find((block) => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new AnthropicError('No text response from Claude', 'UNREADABLE')
    }

    // Parse the JSON response
    const parsed = parseExtractionResponse(textContent.text)

    // Normalize and return
    return normalizeExtractionResult(parsed, availableCategories)
  } catch (error) {
    if (error instanceof AnthropicError) {
      throw error
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new AnthropicError('Processing timed out. Please try again.', 'TIMEOUT')
    }

    throw new AnthropicError(
      error instanceof Error ? error.message : 'Unknown error processing receipt',
      'API_ERROR'
    )
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Extract receipt data from HTML or plain text email body.
 * Sends the content directly to Claude as text (no image conversion needed).
 */
export async function processReceiptText(
  content: string,
  availableCategories: Category[],
  format: 'html' | 'text' = 'html'
): Promise<ReceiptExtractionResult> {
  const client = createAnthropicClient()

  const prompt = format === 'html'
    ? `The following is the HTML body of a forwarded receipt email. Extract receipt information from it.\n\n${RECEIPT_EXTRACTION_PROMPT}\n\nHTML content:\n${content}`
    : `The following is the text body of a forwarded receipt email. Extract receipt information from it.\n\n${RECEIPT_EXTRACTION_PROMPT}\n\nEmail text:\n${content}`

  try {
    const apiResponse = await client.messages.create({
      model: RECEIPT_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const textContent = apiResponse.content.find((block) => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new AnthropicError('No text response from Claude', 'UNREADABLE')
    }

    const parsed = parseExtractionResponse(textContent.text)
    return normalizeExtractionResult(parsed, availableCategories)
  } catch (error) {
    if (error instanceof AnthropicError) {
      throw error
    }

    throw new AnthropicError(
      error instanceof Error ? error.message : 'Unknown error processing receipt text',
      'API_ERROR'
    )
  }
}
