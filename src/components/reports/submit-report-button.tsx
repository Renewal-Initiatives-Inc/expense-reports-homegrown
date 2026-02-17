'use client'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { ComplianceResult } from '@/lib/validations/compliance'
import type { Expense } from '@/types/expenses'
import { AlertTriangle, Loader2, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { SubmitReportDialog } from './submit-report-dialog'

interface SubmitReportButtonProps {
  reportId: string
  reportName: string | null
}

export function SubmitReportButton({ reportId, reportName }: SubmitReportButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [compliance, setCompliance] = useState<ComplianceResult | null>(null)
  const [showDialog, setShowDialog] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [expensesRes, complianceRes] = await Promise.all([
        fetch(`/api/reports/${reportId}/expenses`),
        fetch(`/api/reports/${reportId}/compliance`),
      ])

      if (expensesRes.ok) {
        setExpenses(await expensesRes.json())
      }
      if (complianceRes.ok) {
        setCompliance(await complianceRes.json())
      }
    } catch {
      // Silently fail - button will be disabled
    } finally {
      setIsLoading(false)
    }
  }, [reportId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const expenseCount = expenses.length
  const totalAmount = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || '0'), 0).toFixed(2)
  const canSubmit = expenseCount > 0
  const hasViolations = compliance && !compliance.valid

  const handleSuccess = () => {
    router.refresh()
  }

  if (isLoading) {
    return (
      <Button disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </Button>
    )
  }

  if (!canSubmit) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button disabled data-testid="submit-report-button">
                <Send className="mr-2 h-4 w-4" />
                Submit for Approval
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add at least one expense to submit this report</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        variant={hasViolations ? 'destructive' : 'default'}
        data-testid="submit-report-button"
      >
        {hasViolations && <AlertTriangle className="mr-2 h-4 w-4" />}
        <Send className="mr-2 h-4 w-4" />
        Submit for Approval
      </Button>

      <SubmitReportDialog
        reportId={reportId}
        reportName={reportName || 'Untitled Report'}
        expenseCount={expenseCount}
        totalAmount={totalAmount}
        compliance={compliance}
        expenses={expenses}
        open={showDialog}
        onClose={() => setShowDialog(false)}
        onSuccess={handleSuccess}
      />
    </>
  )
}
