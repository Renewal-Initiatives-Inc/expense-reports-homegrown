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
import type { ComplianceResult, ComplianceViolation } from '@/lib/validations/compliance'
import type { Expense } from '@/types/expenses'
import { AlertTriangle, Loader2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface SubmitReportDialogProps {
  reportId: string
  reportName: string
  expenseCount: number
  totalAmount: string
  compliance: ComplianceResult | null
  expenses: Expense[]
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

function ViolationItem({ violation, expenses }: { violation: ComplianceViolation; expenses: Expense[] }) {
  const expense = expenses.find((e) => e.id === violation.expenseId)
  const expenseLabel = expense
    ? `${expense.merchant || expense.memo || 'Expense'} ($${parseFloat(expense.amount || '0').toFixed(2)})`
    : 'Unknown expense'

  return (
    <li className="flex items-start gap-2 text-sm">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div>
        <span className="font-medium">{expenseLabel}:</span>{' '}
        <span className="text-muted-foreground">{violation.message}</span>
      </div>
    </li>
  )
}

export function SubmitReportDialog({
  reportId,
  reportName,
  expenseCount,
  totalAmount,
  compliance,
  expenses,
  open,
  onClose,
  onSuccess,
}: SubmitReportDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(parseFloat(totalAmount || '0'))

  const hasErrors = compliance && !compliance.valid
  const errorViolations = compliance?.violations.filter((v) => v.severity === 'error') || []

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/reports/${reportId}/submit`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        if (data.violations) {
          toast.error('Please fix compliance issues before submitting')
          return
        }
        throw new Error(data.error || 'Failed to submit report')
      }

      toast.success('Report submitted for approval')
      onSuccess()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit report'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent data-testid="submit-report-dialog" className="max-h-[85vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Submit Report for Approval</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>You are about to submit the following report for approval:</p>

              <div className="rounded-md border bg-muted/50 p-4">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Report Name</dt>
                    <dd className="font-medium text-foreground">{reportName || 'Untitled Report'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Expenses</dt>
                    <dd className="font-medium text-foreground">{expenseCount}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Total Amount</dt>
                    <dd className="font-medium text-foreground">{formattedAmount}</dd>
                  </div>
                </dl>
              </div>

              {/* Compliance Violations */}
              {hasErrors && errorViolations.length > 0 && (
                <div
                  className="rounded-md border border-destructive/50 bg-destructive/10 p-4"
                  data-testid="compliance-violations"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle className="h-5 w-5 text-destructive" />
                    <h4 className="text-sm font-medium text-destructive">
                      {errorViolations.length} compliance {errorViolations.length === 1 ? 'issue' : 'issues'} must be resolved
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    {errorViolations.map((violation, i) => (
                      <ViolationItem key={`${violation.expenseId}-${violation.rule}-${i}`} violation={violation} expenses={expenses} />
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Fix these issues by editing the affected expenses, then try submitting again.
                  </p>
                </div>
              )}

              {!hasErrors && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="text-sm">Once submitted, the report cannot be edited until it is reviewed.</p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting} data-testid="cancel-submit">
            Cancel
          </AlertDialogCancel>
          {hasErrors ? (
            <AlertDialogCancel
              onClick={onClose}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="fix-issues-button"
            >
              Fix Issues
            </AlertDialogCancel>
          ) : (
            <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting} data-testid="confirm-submit">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit for Approval'
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
