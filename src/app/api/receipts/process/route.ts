/**
 * Receipt processing API endpoint.
 * POST /api/receipts/process
 *
 * Sends receipt image to Claude Vision for data extraction.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { AnthropicError, isAnthropicConfigured } from '@/lib/anthropic'
import { processReceiptImage, type ReceiptExtractionResult } from '@/lib/receipt-extraction'

const requestSchema = z.object({
  receiptUrl: z.string().url('Invalid receipt URL'),
  categories: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
      })
    )
    .default([]),
})

export type ProcessReceiptRequest = z.infer<typeof requestSchema>

export interface ProcessReceiptSuccessResponse {
  success: true
  data: ReceiptExtractionResult
}

export interface ProcessReceiptErrorResponse {
  success: false
  error: string
  code: 'UNREADABLE' | 'TIMEOUT' | 'API_ERROR' | 'VALIDATION_ERROR' | 'NO_API_KEY' | 'PARSE_ERROR'
}

export type ProcessReceiptResponse = ProcessReceiptSuccessResponse | ProcessReceiptErrorResponse

export async function POST(request: Request): Promise<NextResponse<ProcessReceiptResponse>> {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'VALIDATION_ERROR' },
        { status: 401 }
      )
    }

    // Check if Anthropic is configured
    if (!isAnthropicConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Receipt processing is not configured. Please add ANTHROPIC_API_KEY to your environment.',
          code: 'NO_API_KEY',
        },
        { status: 503 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const parseResult = requestSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues[0]?.message || 'Invalid request',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      )
    }

    const { receiptUrl, categories } = parseResult.data

    // Process the receipt
    const result = await processReceiptImage(receiptUrl, categories)

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Receipt processing error:', error)

    if (error instanceof AnthropicError) {
      const status = error.code === 'TIMEOUT' ? 408 : error.code === 'UNREADABLE' ? 422 : 500
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process receipt. Please try again.',
        code: 'API_ERROR',
      },
      { status: 500 }
    )
  }
}
