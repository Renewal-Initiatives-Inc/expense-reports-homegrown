import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { auth } from '@/lib/auth'
import { getReportById } from '@/lib/db/queries/reports'
import { ArrowLeft, Pencil } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ReportDeleteButton } from './delete-button'

export const dynamic = 'force-dynamic'

interface ReportDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ReportDetailPage({ params }: ReportDetailPageProps) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const { id } = await params
  const report = await getReportById(id, session.user.id)

  if (!report) {
    notFound()
  }

  const canModify = report.status === 'open'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/reports">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to reports</span>
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight" data-testid="report-title">
              {report.name || 'Untitled Report'}
            </h1>
            <StatusBadge status={report.status} />
          </div>
          <p className="text-muted-foreground">Created on {new Date(report.createdAt).toLocaleDateString()}</p>
        </div>
        {canModify && (
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild data-testid="edit-report-button">
              <Link href={`/reports/${report.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
            <ReportDeleteButton report={report} />
          </div>
        )}
      </div>

      {report.status === 'rejected' && report.reviewerComment && (
        <Card className="border-destructive" data-testid="rejection-card">
          <CardHeader>
            <CardTitle className="text-destructive">Rejection Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{report.reviewerComment}</p>
            {report.reviewedAt && (
              <p className="mt-2 text-sm text-muted-foreground">Reviewed on {new Date(report.reviewedAt).toLocaleDateString()}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card data-testid="report-details-card">
        <CardHeader>
          <CardTitle>Report Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={report.status} />
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Created</dt>
              <dd className="mt-1">{new Date(report.createdAt).toLocaleDateString()}</dd>
            </div>
            {report.submittedAt && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Submitted</dt>
                <dd className="mt-1">{new Date(report.submittedAt).toLocaleDateString()}</dd>
              </div>
            )}
            {report.reviewedAt && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Reviewed</dt>
                <dd className="mt-1">{new Date(report.reviewedAt).toLocaleDateString()}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card data-testid="expenses-card">
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
          <CardDescription>Add your expense receipts and mileage entries to this report.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground">No expenses yet.</p>
            <p className="text-sm text-muted-foreground">Expense management will be added in Phase 3.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
