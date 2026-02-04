'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Expense } from '@/types/expenses'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface ExpenseDeleteDialogProps {
  expense: Expense | null
  reportId: string
  open: boolean
  onClose: () => void
  onDeleted: () => void
}

export function ExpenseDeleteDialog({ expense, reportId, open, onClose, onDeleted }: ExpenseDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  if (!expense) return null

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(parseFloat(expense.amount))

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/reports/${reportId}/expenses/${expense.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete expense')
      }

      toast.success('Expense deleted successfully')
      onDeleted()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete expense'
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent data-testid="expense-delete-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Expense</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this expense?
            <span className="mt-2 block font-medium text-foreground">
              {expense.merchant || 'No merchant'} - {formattedAmount}
            </span>
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} data-testid="cancel-delete">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="confirm-delete"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
