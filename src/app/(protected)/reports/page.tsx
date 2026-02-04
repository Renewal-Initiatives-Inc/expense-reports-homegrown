import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportFilters } from '@/components/reports/report-filters'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { auth } from '@/lib/auth'
import { getFilteredReportsByUserId, type ReportFilters as ReportFiltersType } from '@/lib/db/queries/reports'
import { type ReportStatus } from '@/lib/db/schema'
import { Plus, FileText } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { ReportActions } from './report-actions'

export const dynamic = 'force-dynamic'

interface ReportsPageProps {
  searchParams: Promise<{
    status?: string
    from?: string
    to?: string
  }>
}

const validStatuses: ReportStatus[] = ['open', 'submitted', 'approved', 'rejected']

function isValidStatus(status: string | undefined): status is ReportStatus {
  return status !== undefined && validStatuses.includes(status as ReportStatus)
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const params = await searchParams

  const filters: ReportFiltersType = {
    status: isValidStatus(params.status) ? params.status : undefined,
    fromDate: params.from || undefined,
    toDate: params.to || undefined,
  }

  const hasActiveFilters = filters.status || filters.fromDate || filters.toDate

  const reports = await getFilteredReportsByUserId(session.user.id, filters)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Reports</h1>
          <p className="text-muted-foreground">Create and manage your expense reports</p>
        </div>
        <Button asChild data-testid="new-report-button">
          <Link href="/reports/new">
            <Plus className="mr-2 h-4 w-4" />
            New Report
          </Link>
        </Button>
      </div>

      <Suspense fallback={<div className="h-10" />}>
        <ReportFilters />
      </Suspense>

      {reports.length === 0 ? (
        <Card data-testid="empty-state">
          <CardHeader>
            <CardTitle>{hasActiveFilters ? 'No matching reports' : 'No reports yet'}</CardTitle>
            <CardDescription>
              {hasActiveFilters
                ? 'Try adjusting your filters or create a new report.'
                : 'Create your first expense report to get started.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasActiveFilters ? (
              <div className="flex items-center gap-4">
                <FileText className="h-12 w-12 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No reports match your current filters.</p>
              </div>
            ) : (
              <Button asChild>
                <Link href="/reports/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Report
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="reports-table-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id} data-testid={`report-row-${report.id}`}>
                    <TableCell>
                      <Link href={`/reports/${report.id}`} className="font-medium hover:underline" data-testid={`report-link-${report.id}`}>
                        {report.name || 'Untitled Report'}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={report.status} />
                    </TableCell>
                    <TableCell className="text-right">{report.expenseCount}</TableCell>
                    <TableCell className="text-right">${parseFloat(report.totalAmount || '0').toFixed(2)}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(report.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <ReportActions report={report} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
