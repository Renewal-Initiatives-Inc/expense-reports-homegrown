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
import { Check, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface ApproveReportDialogProps {
  reportId: string
  reportName: string | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ApproveReportDialog({ reportId, reportName, open, onClose, onSuccess }: ApproveReportDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [comment, setComment] = useState('')

  const handleApprove = async () => {
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/admin/reports/${reportId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment: comment.trim() || undefined }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to approve report')
      }

      toast.success('Report approved successfully')
      setComment('')
      onSuccess()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to approve report'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setComment('')
      onClose()
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent data-testid="approve-report-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Approve Report</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                You are about to approve <span className="font-medium text-foreground">{reportName || 'Untitled Report'}</span>.
              </p>

              <div className="space-y-2">
                <Label htmlFor="approve-comment">Comment (optional)</Label>
                <Textarea
                  id="approve-comment"
                  placeholder="Add an optional comment for the submitter..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  data-testid="approve-comment"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting} data-testid="cancel-approve">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleApprove}
            disabled={isSubmitting}
            className="bg-green-600 text-white hover:bg-green-700"
            data-testid="confirm-approve"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Approve Report
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
