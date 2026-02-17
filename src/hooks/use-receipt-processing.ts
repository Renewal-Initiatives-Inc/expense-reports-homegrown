'use client'

/**
 * Hook for processing receipt images with Claude Vision.
 */

import { useState, useCallback } from 'react'
import { useGLAccounts } from './use-gl-accounts'
import type { ReceiptExtractionResult } from '@/lib/receipt-extraction'

export type ReceiptProcessingErrorCode = 'UNREADABLE' | 'TIMEOUT' | 'API_ERROR' | 'VALIDATION_ERROR' | 'NO_API_KEY'

interface UseReceiptProcessingResult {
  processReceipt: (receiptUrl: string) => Promise<void>
  isProcessing: boolean
  result: ReceiptExtractionResult | null
  error: string | null
  errorCode: ReceiptProcessingErrorCode | null
  reset: () => void
}

export function useReceiptProcessing(): UseReceiptProcessingResult {
  const { accounts } = useGLAccounts()
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ReceiptExtractionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<ReceiptProcessingErrorCode | null>(null)

  const processReceipt = useCallback(
    async (receiptUrl: string) => {
      setIsProcessing(true)
      setError(null)
      setErrorCode(null)
      setResult(null)

      try {
        const response = await fetch('/api/receipts/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            receiptUrl,
            categories: accounts.map((a) => ({ id: a.id, name: a.name })),
          }),
        })

        const data = await response.json()

        if (!data.success) {
          setError(data.error || 'Failed to process receipt')
          setErrorCode(data.code || 'API_ERROR')
          return
        }

        setResult(data.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process receipt')
        setErrorCode('API_ERROR')
      } finally {
        setIsProcessing(false)
      }
    },
    [accounts]
  )

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    setErrorCode(null)
    setIsProcessing(false)
  }, [])

  return {
    processReceipt,
    isProcessing,
    result,
    error,
    errorCode,
    reset,
  }
}
