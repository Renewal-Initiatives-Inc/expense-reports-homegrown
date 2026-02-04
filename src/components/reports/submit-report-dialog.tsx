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
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface SubmitReportDialogProps {
  reportId: string
  reportName: string
  expenseCount: number
  totalAmount: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function SubmitReportDialog({
  reportId,
  reportName,
  expenseCount,
  totalAmount,
  open,
  onClose,
  onSuccess,
}: SubmitReportDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(parseFloat(totalAmount || '0'))

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/reports/${reportId}/submit`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
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
      <AlertDialogContent data-testid="submit-report-dialog">
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

              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-sm">Once submitted, the report cannot be edited until it is reviewed.</p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting} data-testid="cancel-submit">
            Cancel
          </AlertDialogCancel>
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
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
