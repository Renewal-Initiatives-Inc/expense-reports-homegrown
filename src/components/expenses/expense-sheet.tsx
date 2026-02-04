'use client'

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { Expense } from '@/types/expenses'
import { ExpenseForm } from './expense-form'

interface ExpenseSheetProps {
  reportId: string
  expense?: Expense | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ExpenseSheet({ reportId, expense, open, onClose, onSuccess }: ExpenseSheetProps) {
  const isEditMode = !!expense

  const handleSuccess = () => {
    onSuccess()
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-md" data-testid="expense-sheet">
        <SheetHeader>
          <SheetTitle>{isEditMode ? 'Edit Expense' : 'Add Expense'}</SheetTitle>
          <SheetDescription>
            {isEditMode ? 'Update the expense details below.' : 'Fill out the expense details below.'}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          <ExpenseForm
            reportId={reportId}
            expense={expense || undefined}
            onSuccess={handleSuccess}
            onCancel={onClose}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
