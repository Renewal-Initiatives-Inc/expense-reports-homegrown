'use client'

import { Button } from '@/components/ui/button'
import { ConfidenceIndicator, hasLowConfidenceFields } from '@/components/ui/confidence-indicator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useFunds } from '@/hooks/use-funds'
import { useGLAccounts } from '@/hooks/use-gl-accounts'
import { useReceiptProcessing } from '@/hooks/use-receipt-processing'
import type { Expense } from '@/types/expenses'
import { AlertCircle, AlertTriangle, Loader2, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ReceiptUpload } from './receipt-upload'

const DEFAULT_FUND_ID = 1 // General Fund (Unrestricted)

interface ExpenseFormProps {
  reportId: string
  expense?: Expense
  onSuccess?: () => void
  onCancel?: () => void
}

export function ExpenseForm({ reportId, expense, onSuccess, onCancel }: ExpenseFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { accounts, isLoading: accountsLoading } = useGLAccounts()
  const { funds, isLoading: fundsLoading } = useFunds()
  const { processReceipt, isProcessing, result: extractionResult, error: extractionError, errorCode, reset: resetExtraction } = useReceiptProcessing()

  const isEditMode = !!expense

  // Form state
  const [amount, setAmount] = useState(expense?.amount || '')
  const [date, setDate] = useState(expense?.date || new Date().toISOString().split('T')[0])
  const [glAccountId, setGlAccountId] = useState(expense?.glAccountId?.toString() || '')
  const [fundId, setFundId] = useState(expense?.fundId?.toString() || DEFAULT_FUND_ID.toString())
  const [merchant, setMerchant] = useState(expense?.merchant || '')
  const [memo, setMemo] = useState(expense?.memo || '')
  const [receiptUrl, setReceiptUrl] = useState<string | null>(expense?.receiptUrl || null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // AI confidence tracking
  const [aiConfidence, setAiConfidence] = useState<Record<string, number> | null>(
    expense?.aiConfidence as Record<string, number> | null
  )

  // Apply extraction results when they arrive
  useEffect(() => {
    if (extractionResult) {
      if (extractionResult.amount) {
        setAmount(extractionResult.amount)
      }
      if (extractionResult.date) {
        setDate(extractionResult.date)
      }
      if (extractionResult.merchant) {
        setMerchant(extractionResult.merchant)
      }
      if (extractionResult.suggestedCategoryId) {
        setGlAccountId(extractionResult.suggestedCategoryId)
      }
      if (extractionResult.memo) {
        setMemo(extractionResult.memo)
      }

      setAiConfidence(extractionResult.confidence)
      toast.success('Receipt data extracted - please review the fields')
    }
  }, [extractionResult])

  const handleProcessReceipt = async () => {
    if (!receiptUrl) return
    await processReceipt(receiptUrl)
  }

  const handleRetry = () => {
    resetExtraction()
    if (receiptUrl) {
      processReceipt(receiptUrl)
    }
  }

  const showLowConfidenceWarning = aiConfidence && hasLowConfidenceFields(aiConfidence)

  const selectedAccount = accounts.find((a) => a.id.toString() === glAccountId)
  const selectedFund = funds.find((f) => f.id.toString() === fundId)

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Amount is required and must be greater than 0'
    } else if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
      newErrors.amount = 'Amount must be a valid decimal (e.g., 12.50)'
    }

    if (!date) {
      newErrors.date = 'Date is required'
    }

    if (!glAccountId) {
      newErrors.glAccountId = 'GL account is required'
    }

    if (!fundId) {
      newErrors.fundId = 'Funding source is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    startTransition(async () => {
      try {
        const payload = {
          type: 'out_of_pocket' as const,
          amount,
          date,
          fundId: parseInt(fundId),
          fundName: selectedFund?.name || '',
          glAccountId: parseInt(glAccountId),
          glAccountName: selectedAccount?.name || '',
          merchant: merchant || undefined,
          memo: memo || undefined,
          receiptUrl: receiptUrl || undefined,
          receiptThumbnailUrl: receiptUrl || undefined,
          aiConfidence: aiConfidence || undefined,
        }

        const url = isEditMode ? `/api/reports/${reportId}/expenses/${expense.id}` : `/api/reports/${reportId}/expenses`

        const response = await fetch(url, {
          method: isEditMode ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || `Failed to ${isEditMode ? 'update' : 'create'} expense`)
        }

        toast.success(isEditMode ? 'Expense updated successfully' : 'Expense added successfully')

        if (onSuccess) {
          onSuccess()
        } else {
          router.refresh()
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred'
        toast.error(message)
      }
    })
  }

  if (accountsLoading || fundsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 relative" data-testid="expense-form">
      {/* Processing Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg z-10" data-testid="processing-overlay">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing receipt...</p>
            <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
          </div>
        </div>
      )}

      {/* Low Confidence Warning Banner */}
      {showLowConfidenceWarning && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4" data-testid="low-confidence-warning">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Review Required</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Some fields were extracted with low confidence. Please verify the highlighted values are correct before saving.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Extraction Error Banner */}
      {extractionError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4" data-testid="extraction-error">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200">Could not read receipt</h4>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {errorCode === 'UNREADABLE'
                  ? "The receipt image couldn't be processed. You can enter the details manually below."
                  : errorCode === 'TIMEOUT'
                    ? 'Processing took too long. Please try again or enter details manually.'
                    : errorCode === 'NO_API_KEY'
                      ? 'Receipt processing is not configured. Please contact your administrator.'
                      : 'An error occurred. Please try again or enter details manually.'}
              </p>
              {errorCode !== 'NO_API_KEY' && (
                <Button type="button" variant="outline" size="sm" onClick={handleRetry} className="mt-2" data-testid="retry-extraction">
                  Try Again
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receipt Upload */}
      <div className="space-y-2">
        <Label>Receipt Image</Label>
        <ReceiptUpload value={receiptUrl} onChange={setReceiptUrl} disabled={isPending || isProcessing} />

        {receiptUrl && !isProcessing && (
          <div className="flex items-center gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleProcessReceipt}
              disabled={isPending}
              data-testid="process-receipt-button"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Extract from Receipt
            </Button>
            {extractionResult && (
              <span className="text-sm text-muted-foreground">
                Data extracted - review and edit as needed
              </span>
            )}
          </div>
        )}
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">
          Amount <span className="text-destructive">*</span>
          {aiConfidence?.amount !== undefined && <ConfidenceIndicator confidence={aiConfidence.amount} />}
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
          <Input
            id="amount"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pl-7"
            disabled={isPending}
            data-testid="expense-amount"
          />
        </div>
        {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="date">
          Date <span className="text-destructive">*</span>
          {aiConfidence?.date !== undefined && <ConfidenceIndicator confidence={aiConfidence.date} />}
        </Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={isPending}
          data-testid="expense-date"
        />
        {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
      </div>

      {/* GL Account */}
      <div className="space-y-2">
        <Label htmlFor="glAccount">
          GL Account <span className="text-destructive">*</span>
          {aiConfidence?.category !== undefined && <ConfidenceIndicator confidence={aiConfidence.category} />}
        </Label>
        <Select value={glAccountId} onValueChange={setGlAccountId} disabled={isPending}>
          <SelectTrigger className="w-full" data-testid="expense-gl-account">
            <SelectValue placeholder="Select a GL account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id.toString()}>
                {account.code} - {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.glAccountId && <p className="text-sm text-destructive">{errors.glAccountId}</p>}
      </div>

      {/* Merchant */}
      <div className="space-y-2">
        <Label htmlFor="merchant">
          Merchant
          {aiConfidence?.merchant !== undefined && <ConfidenceIndicator confidence={aiConfidence.merchant} />}
        </Label>
        <Input
          id="merchant"
          type="text"
          placeholder="e.g., Home Depot"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          maxLength={200}
          disabled={isPending}
          data-testid="expense-merchant"
        />
      </div>

      {/* Memo */}
      <div className="space-y-2">
        <Label htmlFor="memo">Description / Memo</Label>
        <Textarea
          id="memo"
          placeholder="Business purpose of this expense"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          maxLength={500}
          rows={3}
          disabled={isPending}
          data-testid="expense-memo"
        />
      </div>

      {/* Funding Source */}
      <div className="space-y-2">
        <Label htmlFor="fund">
          Funding Source <span className="text-destructive">*</span>
        </Label>
        <Select value={fundId} onValueChange={setFundId} disabled={isPending}>
          <SelectTrigger className="w-full" data-testid="expense-fund">
            <SelectValue placeholder="Select a funding source" />
          </SelectTrigger>
          <SelectContent>
            {funds.map((fund) => (
              <SelectItem key={fund.id} value={fund.id.toString()}>
                {fund.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.fundId && <p className="text-sm text-destructive">{errors.fundId}</p>}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending} data-testid="cancel-expense">
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isPending} data-testid="submit-expense">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : isEditMode ? (
            'Save Changes'
          ) : (
            'Add Expense'
          )}
        </Button>
      </div>
    </form>
  )
}
