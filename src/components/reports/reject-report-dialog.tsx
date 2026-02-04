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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface RejectReportDialogProps {
  reportId: string
  reportName: string | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RejectReportDialog({ reportId, reportName, open, onClose, onSuccess }: RejectReportDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleReject = async () => {
    const trimmedComment = comment.trim()

    if (!trimmedComment) {
      setError('Rejection reason is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/reports/${reportId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment: trimmedComment }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reject report')
      }

      toast.success('Report rejected')
      setComment('')
      onSuccess()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reject report'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setComment('')
      setError(null)
      onClose()
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent data-testid="reject-report-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Reject Report</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                You are about to reject <span className="font-medium text-foreground">{reportName || 'Untitled Report'}</span>.
              </p>

              <div className="space-y-2">
                <Label htmlFor="reject-comment">
                  Rejection Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="reject-comment"
                  placeholder="Explain why this report is being rejected..."
                  value={comment}
                  onChange={(e) => {
                    setComment(e.target.value)
                    if (error) setError(null)
                  }}
                  rows={4}
                  className={error ? 'border-destructive' : ''}
                  data-testid="reject-comment"
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-sm">The submitter will need to address your feedback and resubmit the report.</p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting} data-testid="cancel-reject">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReject}
            disabled={isSubmitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="confirm-reject"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rejecting...
              </>
            ) : (
              <>
                <X className="mr-2 h-4 w-4" />
                Reject Report
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
