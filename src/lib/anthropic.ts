/**
 * Anthropic API client for Claude Vision receipt processing.
 * Server-side only - do not import in client components.
 */

import Anthropic from '@anthropic-ai/sdk'

// Model to use for receipt processing (Claude Sonnet for vision capabilities)
export const RECEIPT_MODEL = 'claude-sonnet-4-20250514'

// Processing timeout in milliseconds
export const PROCESSING_TIMEOUT_MS = 30000

// Confidence level mapping from qualitative to numeric
export const CONFIDENCE_MAP = {
  high: 0.95,
  medium: 0.75,
  low: 0.45,
} as const

export type ConfidenceLevel = keyof typeof CONFIDENCE_MAP

export class AnthropicError extends Error {
  constructor(
    message: string,
    public code: 'NO_API_KEY' | 'API_ERROR' | 'TIMEOUT' | 'PARSE_ERROR' | 'UNREADABLE'
  ) {
    super(message)
    this.name = 'AnthropicError'
  }
}

/**
 * Create an Anthropic client instance.
 * Throws AnthropicError if API key is not configured.
 */
export function createAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new AnthropicError(
      'ANTHROPIC_API_KEY is not configured. Please add it to your environment variables.',
      'NO_API_KEY'
    )
  }

  return new Anthropic({ apiKey })
}

/**
 * Check if the Anthropic API key is configured.
 */
export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

/**
 * Convert qualitative confidence to numeric value.
 */
export function mapConfidence(level: string | null | undefined): number {
  if (!level) return CONFIDENCE_MAP.low
  const normalized = level.toLowerCase() as ConfidenceLevel
  return CONFIDENCE_MAP[normalized] ?? CONFIDENCE_MAP.low
}

// Receipt extraction prompt for Claude Vision
export const RECEIPT_EXTRACTION_PROMPT = `Analyze this receipt image and extract the following information.
Return your response as JSON with these fields:

{
  "merchant": {
    "value": "store/restaurant name",
    "confidence": "high" | "medium" | "low"
  },
  "amount": {
    "value": "total amount as number (e.g., 42.50)",
    "confidence": "high" | "medium" | "low"
  },
  "date": {
    "value": "YYYY-MM-DD format",
    "confidence": "high" | "medium" | "low"
  },
  "category_hint": {
    "value": "type of expense (e.g., Meals, Office Supplies, Travel, Gas, Lodging, Equipment)",
    "confidence": "high" | "medium" | "low"
  },
  "notes": "any other relevant information from the receipt"
}

Guidelines:
- For amount, use the grand total/final amount, not subtotals
- If date format is unclear, use your best interpretation
- For confidence:
  - "high": clearly visible and unambiguous
  - "medium": partially visible or requires interpretation
  - "low": guessing or very unclear
- If a field cannot be determined, use null for value and "low" for confidence
- Return only valid JSON, no additional text`

/**
 * Parsed receipt extraction result from Claude.
 */
export interface ReceiptExtractionResponse {
  merchant: {
    value: string | null
    confidence: ConfidenceLevel
  }
  amount: {
    value: string | null
    confidence: ConfidenceLevel
  }
  date: {
    value: string | null
    confidence: ConfidenceLevel
  }
  category_hint: {
    value: string | null
    confidence: ConfidenceLevel
  }
  notes: string | null
}

/**
 * Parse Claude's JSON response into structured data.
 */
export function parseExtractionResponse(content: string): ReceiptExtractionResponse {
  try {
    // Try to extract JSON from the response (handle potential markdown code blocks)
    let jsonStr = content.trim()

    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7)
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3)
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3)
    }

    const parsed = JSON.parse(jsonStr.trim())

    // Validate structure
    return {
      merchant: {
        value: parsed.merchant?.value ?? null,
        confidence: validateConfidence(parsed.merchant?.confidence),
      },
      amount: {
        value: parsed.amount?.value ?? null,
        confidence: validateConfidence(parsed.amount?.confidence),
      },
      date: {
        value: parsed.date?.value ?? null,
        confidence: validateConfidence(parsed.date?.confidence),
      },
      category_hint: {
        value: parsed.category_hint?.value ?? null,
        confidence: validateConfidence(parsed.category_hint?.confidence),
      },
      notes: parsed.notes ?? null,
    }
  } catch {
    throw new AnthropicError(
      'Failed to parse receipt extraction response',
      'PARSE_ERROR'
    )
  }
}

function validateConfidence(value: unknown): ConfidenceLevel {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase()
    if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
      return normalized
    }
  }
  return 'low'
}
