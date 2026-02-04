'use client'

import type { Expense } from '@/types/expenses'
import type { ReportStatus } from '@/lib/db/schema/expense-reports'
import { Receipt } from 'lucide-react'
import { useState } from 'react'
import { ExpenseCard } from './expense-card'
import { ExpenseDeleteDialog } from './expense-delete-dialog'
import { ReceiptViewer } from './receipt-viewer'

interface ExpenseListProps {
  expenses: Expense[]
  reportId: string
  reportStatus: ReportStatus
  onEdit: (expense: Expense) => void
  onExpenseDeleted: () => void
}

export function ExpenseList({ expenses, reportId, reportStatus, onEdit, onExpenseDeleted }: ExpenseListProps) {
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null)
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)

  const canModify = reportStatus === 'open'

  const totalAmount = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0)
  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(totalAmount)

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-expenses">
        <Receipt className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">No expenses yet</p>
        <p className="text-muted-foreground">Add your first expense to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4" data-testid="expense-list">
      {/* Summary */}
      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
        <span className="text-sm text-muted-foreground">
          {expenses.length} expense{expenses.length === 1 ? '' : 's'}
        </span>
        <span className="text-lg font-semibold" data-testid="expenses-total">
          Total: {formattedTotal}
        </span>
      </div>

      {/* Expense Cards */}
      <div className="space-y-3">
        {expenses.map((expense) => (
          <ExpenseCard
            key={expense.id}
            expense={expense}
            canModify={canModify}
            onEdit={() => onEdit(expense)}
            onDelete={() => setExpenseToDelete(expense)}
            onViewReceipt={() => setSelectedReceipt(expense.receiptUrl)}
          />
        ))}
      </div>

      {/* Receipt Viewer Modal */}
      <ReceiptViewer url={selectedReceipt} open={!!selectedReceipt} onClose={() => setSelectedReceipt(null)} />

      {/* Delete Confirmation Dialog */}
      <ExpenseDeleteDialog
        expense={expenseToDelete}
        reportId={reportId}
        open={!!expenseToDelete}
        onClose={() => setExpenseToDelete(null)}
        onDeleted={onExpenseDeleted}
      />
    </div>
  )
}
