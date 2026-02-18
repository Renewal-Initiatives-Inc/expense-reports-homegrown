'use client'

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ReportStatus } from '@/lib/db/schema/expense-reports'
import type { Expense } from '@/types/expenses'
import { Car, MoreVertical, Pencil, Receipt, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ExpenseDeleteDialog } from './expense-delete-dialog'

interface ExpenseListProps {
  expenses: Expense[]
  reportId: string
  reportStatus: ReportStatus
  onEdit: (expense: Expense) => void
  onExpenseDeleted: () => void
}

export function ExpenseList({ expenses, reportId, reportStatus, onEdit, onExpenseDeleted }: ExpenseListProps) {
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

      {/* Expenses Table */}
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">Type</TableHead>
            <TableHead className="w-[80px]">Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-[130px]">GL Account</TableHead>
            <TableHead className="w-[100px]">Fund</TableHead>
            <TableHead className="w-[80px] text-right">Amount</TableHead>
            <TableHead className="w-[60px]">Receipt</TableHead>
            {canModify && <TableHead className="w-[50px]" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow key={expense.id} data-testid={`expense-row-${expense.id}`}>
              <TableCell>
                {expense.type === 'mileage' ? (
                  <Car className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                )}
              </TableCell>
              <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
              <TableCell className="whitespace-normal">
                <p className="font-medium">{expense.merchant || '-'}</p>
                {expense.memo && <p className="text-sm text-muted-foreground">{expense.memo}</p>}
                {expense.type === 'mileage' && expense.miles && (
                  <p className="text-sm text-muted-foreground">{expense.miles} miles</p>
                )}
              </TableCell>
              <TableCell className="whitespace-normal">{expense.glAccountName || expense.categoryName || '-'}</TableCell>
              <TableCell className="whitespace-normal">{expense.fundName || '-'}</TableCell>
              <TableCell className="text-right font-medium">
                ${parseFloat(expense.amount || '0').toFixed(2)}
              </TableCell>
              <TableCell>
                {expense.receiptUrl ? (
                  <a
                    href={expense.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View
                  </a>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              {canModify && (
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="expense-actions">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(expense)} data-testid="edit-expense">
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setExpenseToDelete(expense)} className="text-destructive" data-testid="delete-expense">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
