'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { ReportStatus } from '@/lib/db/schema/expense-reports'
import type { Expense } from '@/types/expenses'
import { Car, ChevronDown, Loader2, Plus, Receipt } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { ExpenseList } from './expense-list'
import { ExpenseSheet } from './expense-sheet'
import { MileageExpenseSheet } from './mileage-expense-sheet'

interface ExpensesSectionProps {
  reportId: string
  reportStatus: ReportStatus
}

type ExpenseSheetType = 'out_of_pocket' | 'mileage' | null

export function ExpensesSection({ reportId, reportStatus }: ExpensesSectionProps) {
  const router = useRouter()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sheetType, setSheetType] = useState<ExpenseSheetType>(null)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  const canModify = reportStatus === 'open'

  const fetchExpenses = useCallback(async () => {
    try {
      const response = await fetch(`/api/reports/${reportId}/expenses`)
      if (!response.ok) {
        throw new Error('Failed to fetch expenses')
      }
      const data = await response.json()
      setExpenses(data)
      setError(null)
    } catch {
      setError('Failed to load expenses')
    } finally {
      setIsLoading(false)
    }
  }, [reportId])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const handleAddOutOfPocket = () => {
    setEditingExpense(null)
    setSheetType('out_of_pocket')
  }

  const handleAddMileage = () => {
    setEditingExpense(null)
    setSheetType('mileage')
  }

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setSheetType(expense.type)
  }

  const handleSheetClose = () => {
    setSheetType(null)
    setEditingExpense(null)
  }

  const handleExpenseChange = () => {
    fetchExpenses()
    router.refresh()
  }

  return (
    <Card data-testid="expenses-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Expenses</CardTitle>
          <CardDescription>Add your expense receipts and mileage entries to this report.</CardDescription>
        </div>
        {canModify && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" data-testid="add-expense-button">
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleAddOutOfPocket} data-testid="add-out-of-pocket">
                <Receipt className="mr-2 h-4 w-4" />
                Out-of-Pocket Expense
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddMileage} data-testid="add-mileage">
                <Car className="mr-2 h-4 w-4" />
                Mileage Expense
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchExpenses} className="mt-2">
              Try Again
            </Button>
          </div>
        ) : (
          <ExpenseList
            expenses={expenses}
            reportId={reportId}
            reportStatus={reportStatus}
            onEdit={handleEditExpense}
            onExpenseDeleted={handleExpenseChange}
          />
        )}
      </CardContent>

      {/* Add/Edit Out-of-Pocket Expense Sheet */}
      <ExpenseSheet
        reportId={reportId}
        expense={editingExpense?.type === 'out_of_pocket' ? editingExpense : undefined}
        open={sheetType === 'out_of_pocket'}
        onClose={handleSheetClose}
        onSuccess={handleExpenseChange}
      />

      {/* Add/Edit Mileage Expense Sheet */}
      <MileageExpenseSheet
        reportId={reportId}
        expense={editingExpense?.type === 'mileage' ? editingExpense : undefined}
        open={sheetType === 'mileage'}
        onClose={handleSheetClose}
        onSuccess={handleExpenseChange}
      />
    </Card>
  )
}
