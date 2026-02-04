'use client'

import { Button } from '@/components/ui/button'
import { ConfidenceIndicator, hasLowConfidenceFields } from '@/components/ui/confidence-indicator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCategories } from '@/hooks/use-categories'
import { useProjects } from '@/hooks/use-projects'
import { useReceiptProcessing } from '@/hooks/use-receipt-processing'
import type { Expense } from '@/types/expenses'
import { AlertCircle, AlertTriangle, Loader2, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ReceiptUpload } from './receipt-upload'

interface ExpenseFormProps {
  reportId: string
  expense?: Expense
  onSuccess?: () => void
  onCancel?: () => void
}

export function ExpenseForm({ reportId, expense, onSuccess, onCancel }: ExpenseFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { categories, isLoading: categoriesLoading } = useCategories()
  const { projects, isLoading: projectsLoading } = useProjects()
  const { processReceipt, isProcessing, result: extractionResult, error: extractionError, errorCode, reset: resetExtraction } = useReceiptProcessing()

  const isEditMode = !!expense

  // Form state
  const [amount, setAmount] = useState(expense?.amount || '')
  const [date, setDate] = useState(expense?.date || new Date().toISOString().split('T')[0])
  const [categoryId, setCategoryId] = useState(expense?.categoryId || '')
  const [merchant, setMerchant] = useState(expense?.merchant || '')
  const [memo, setMemo] = useState(expense?.memo || '')
  const [projectId, setProjectId] = useState(expense?.projectId || '')
  const [billable, setBillable] = useState(expense?.billable || false)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(expense?.receiptUrl || null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // AI confidence tracking
  const [aiConfidence, setAiConfidence] = useState<Record<string, number> | null>(
    expense?.aiConfidence as Record<string, number> | null
  )

  // Apply extraction results when they arrive
  useEffect(() => {
    if (extractionResult) {
      // Populate form with extracted data
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
        setCategoryId(extractionResult.suggestedCategoryId)
      }
      if (extractionResult.memo) {
        setMemo(extractionResult.memo)
      }

      // Store confidence scores
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

  const selectedCategory = categories.find((c) => c.id === categoryId)
  const selectedProject = projects.find((p) => p.id === projectId)

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

    if (!categoryId) {
      newErrors.categoryId = 'Category is required'
    }

    if (billable && !projectId) {
      newErrors.billable = 'Project is required when billable is checked'
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
          categoryId,
          categoryName: selectedCategory?.name || '',
          merchant: merchant || undefined,
          memo: memo || undefined,
          projectId: projectId || undefined,
          projectName: selectedProject?.name || undefined,
          billable: projectId ? billable : false,
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

  const handleProjectChange = (value: string) => {
    setProjectId(value === 'none' ? '' : value)
    // Clear billable if no project selected
    if (value === 'none' || !value) {
      setBillable(false)
    }
  }

  if (categoriesLoading || projectsLoading) {
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

        {/* Process Receipt Button */}
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

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">
          Category <span className="text-destructive">*</span>
          {aiConfidence?.category !== undefined && <ConfidenceIndicator confidence={aiConfidence.category} />}
        </Label>
        <Select value={categoryId} onValueChange={setCategoryId} disabled={isPending}>
          <SelectTrigger className="w-full" data-testid="expense-category">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId}</p>}
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
          placeholder="e.g., Starbucks"
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
          placeholder="Optional notes about this expense"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          maxLength={500}
          rows={3}
          disabled={isPending}
          data-testid="expense-memo"
        />
      </div>

      {/* Project */}
      <div className="space-y-2">
        <Label htmlFor="project">Project</Label>
        <Select value={projectId || 'none'} onValueChange={handleProjectChange} disabled={isPending}>
          <SelectTrigger className="w-full" data-testid="expense-project">
            <SelectValue placeholder="Select a project (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No project</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Billable - only show when project selected */}
      {projectId && (
        <div className="flex items-center gap-2">
          <input
            id="billable"
            type="checkbox"
            checked={billable}
            onChange={(e) => setBillable(e.target.checked)}
            disabled={isPending}
            className="h-4 w-4 rounded border-gray-300"
            data-testid="expense-billable"
          />
          <Label htmlFor="billable" className="font-normal">
            Mark as billable to client
          </Label>
        </div>
      )}
      {errors.billable && <p className="text-sm text-destructive">{errors.billable}</p>}

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
