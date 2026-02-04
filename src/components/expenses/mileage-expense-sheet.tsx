'use client'

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { Expense } from '@/types/expenses'
import { MileageExpenseForm } from './mileage-expense-form'

interface MileageExpenseSheetProps {
  reportId: string
  expense?: Expense
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function MileageExpenseSheet({ reportId, expense, open, onClose, onSuccess }: MileageExpenseSheetProps) {
  const isEditMode = !!expense

  const handleSuccess = () => {
    onSuccess()
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-md" data-testid="mileage-expense-sheet">
        <SheetHeader>
          <SheetTitle>{isEditMode ? 'Edit Mileage Expense' : 'Add Mileage Expense'}</SheetTitle>
          <SheetDescription>
            {isEditMode ? 'Update the mileage expense details below.' : 'Enter the trip details to calculate mileage reimbursement.'}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          <MileageExpenseForm reportId={reportId} expense={expense} onSuccess={handleSuccess} onCancel={onClose} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
