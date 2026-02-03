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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { ExpenseReportSummary } from '@/types/reports'
import { Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

interface ReportActionsProps {
  report: ExpenseReportSummary
}

export function ReportActions({ report }: ReportActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)

  const canModify = report.status === 'open'

  const handleDelete = async () => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/reports/${report.id}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to delete report')
        }

        toast.success('Report deleted successfully')
        setIsOpen(false)
        router.refresh()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete report'
        toast.error(message)
      }
    })
  }

  if (!canModify) {
    return null
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" asChild data-testid={`edit-report-${report.id}`}>
        <Link href={`/reports/${report.id}/edit`}>
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit</span>
        </Link>
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" data-testid={`delete-report-${report.id}`}>
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{report.name || 'this report'}&quot;? This action cannot be undone. All expenses in
              this report will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive text-white hover:bg-destructive/90">
              {isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
