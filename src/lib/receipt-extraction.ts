/**
 * Receipt extraction utilities for category matching and result normalization.
 */

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
  meals: ['food', 'restaurant', 'dining', 'lunch', 'dinner', 'breakfast', 'cafe', 'coffee', 'fast food', 'takeout'],
  'meals and entertainment': ['food', 'restaurant', 'dining', 'lunch', 'dinner', 'breakfast', 'entertainment'],
  travel: ['transportation', 'flight', 'airline', 'airfare', 'hotel', 'lodging', 'taxi', 'uber', 'lyft', 'train'],
  'travel expense': ['transportation', 'flight', 'airline', 'airfare', 'hotel', 'lodging'],
  'auto and truck expenses': ['gas', 'fuel', 'gasoline', 'car', 'vehicle', 'automotive', 'parking', 'toll'],
  'office supplies': ['supplies', 'stationery', 'office', 'paper', 'pens', 'desk', 'printer'],
  equipment: ['hardware', 'computer', 'electronics', 'machinery', 'tools'],
  'professional services': ['consulting', 'legal', 'accounting', 'contractor'],
  utilities: ['electric', 'water', 'internet', 'phone', 'utility'],
  'software and subscriptions': ['subscription', 'saas', 'software', 'app', 'technology'],
  lodging: ['hotel', 'motel', 'airbnb', 'accommodation', 'stay'],
  'other miscellaneous expense': ['other', 'miscellaneous', 'misc', 'general'],
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
 * Process a receipt image using Claude Vision.
 * Returns extracted data with confidence scores.
 */
export async function processReceiptImage(
  imageUrl: string,
  availableCategories: Category[]
): Promise<ReceiptExtractionResult> {
  const client = createAnthropicClient()

  // Fetch image and convert to base64
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PROCESSING_TIMEOUT_MS)

  try {
    // Fetch the image
    const imageResponse = await fetch(imageUrl, { signal: controller.signal })
    if (!imageResponse.ok) {
      throw new AnthropicError(`Failed to fetch image: ${imageResponse.status}`, 'UNREADABLE')
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')

    // Determine media type
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
    const mediaType = contentType.split(';')[0].trim() as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

    // Call Claude Vision
    const response = await client.messages.create({
      model: RECEIPT_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: RECEIPT_EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    })

    // Extract text content
    const textContent = response.content.find((block) => block.type === 'text')
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
