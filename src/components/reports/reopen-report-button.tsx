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
import { Button } from '@/components/ui/button'
import { Loader2, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

interface ReopenReportButtonProps {
  reportId: string
  reportName: string | null
}

export function ReopenReportButton({ reportId, reportName }: ReopenReportButtonProps) {
  const router = useRouter()
  const [showDialog, setShowDialog] = useState(false)
  const [isReopening, setIsReopening] = useState(false)

  const handleReopen = async () => {
    setIsReopening(true)

    try {
      const response = await fetch(`/api/reports/${reportId}/reopen`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reopen report')
      }

      toast.success('Report reopened for editing')
      setShowDialog(false)
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reopen report'
      toast.error(message)
    } finally {
      setIsReopening(false)
    }
  }

  return (
    <>
      <Button onClick={() => setShowDialog(true)} data-testid="reopen-report-button">
        <Pencil className="mr-2 h-4 w-4" />
        Edit Report
      </Button>

      <AlertDialog open={showDialog} onOpenChange={(open) => !open && setShowDialog(false)}>
        <AlertDialogContent data-testid="reopen-report-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Rejected Report</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are about to reopen <span className="font-medium text-foreground">{reportName || 'Untitled Report'}</span> for
                  editing.
                </p>
                <p>After making your changes, you can submit the report again for approval.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReopening} data-testid="cancel-reopen">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleReopen} disabled={isReopening} data-testid="confirm-reopen">
              {isReopening ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reopening...
                </>
              ) : (
                'Reopen for Editing'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
