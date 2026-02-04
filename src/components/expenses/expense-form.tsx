'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCategories } from '@/hooks/use-categories'
import { useProjects } from '@/hooks/use-projects'
import type { Expense } from '@/types/expenses'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
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
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="expense-form">
      {/* Receipt Upload */}
      <div className="space-y-2">
        <Label>Receipt Image</Label>
        <ReceiptUpload value={receiptUrl} onChange={setReceiptUrl} disabled={isPending} />
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">
          Amount <span className="text-destructive">*</span>
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
        <Label htmlFor="merchant">Merchant</Label>
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
