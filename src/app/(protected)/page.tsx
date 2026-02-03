import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RoleBadge } from '@/components/ui/role-badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { auth } from '@/lib/auth'
import { getRecentReports, getReportCountsByStatus, getSubmittedReportsCount } from '@/lib/db/queries/reports'
import { ClipboardList, FileText, Plus } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const [counts, recentReports, pendingApprovalCount] = await Promise.all([
    getReportCountsByStatus(session.user.id),
    getRecentReports(session.user.id, 5),
    session.user.role === 'admin' ? getSubmittedReportsCount() : Promise.resolve(0),
  ])

  const totalReports = counts.open + counts.submitted + counts.approved + counts.rejected

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.user.name || session.user.email}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="stat-open">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.open}</div>
            <p className="text-xs text-muted-foreground">Ready to add expenses</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-submitted">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.submitted}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-approved">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.approved}</div>
            <p className="text-xs text-muted-foreground">Ready for reimbursement</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-rejected">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <FileText className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.rejected}</div>
            <p className="text-xs text-muted-foreground">Need revision</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="quick-actions-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Quick Actions
              <RoleBadge role={session.user.role} />
            </CardTitle>
            <CardDescription>
              {session.user.role === 'admin'
                ? 'Create reports or review submitted reports.'
                : 'Create and manage your expense reports.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button asChild data-testid="create-report-action">
              <Link href="/reports/new">
                <Plus className="mr-2 h-4 w-4" />
                Create New Report
              </Link>
            </Button>
            <Button variant="outline" asChild data-testid="view-reports-action">
              <Link href="/reports">
                <FileText className="mr-2 h-4 w-4" />
                View All Reports ({totalReports})
              </Link>
            </Button>
            {session.user.role === 'admin' && pendingApprovalCount > 0 && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/50 dark:bg-orange-950/30">
                <p className="font-medium text-orange-700 dark:text-orange-400">
                  {pendingApprovalCount} report{pendingApprovalCount !== 1 ? 's' : ''} pending approval
                </p>
                <p className="text-sm text-orange-600 dark:text-orange-500">
                  Review functionality coming in a future phase.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="recent-reports-card">
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>Your most recently created reports.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">No reports yet.</p>
                <Button asChild variant="link" className="mt-2">
                  <Link href="/reports/new">Create your first report</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentReports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/reports/${report.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    data-testid={`recent-report-${report.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{report.name || 'Untitled Report'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(report.createdAt).toLocaleDateString()} &middot; {report.expenseCount} expense
                        {report.expenseCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <StatusBadge status={report.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
