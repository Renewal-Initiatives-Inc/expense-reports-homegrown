'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Expense } from '@/types/expenses'
import type { ExpenseReport } from '@/types/reports'
import { ArrowLeft, Car, Check, Loader2, Receipt, X } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ApproveReportDialog } from '@/components/reports/approve-report-dialog'
import { RejectReportDialog } from '@/components/reports/reject-report-dialog'

type ReportWithSummary = ExpenseReport & { expenseCount: number; totalAmount: string | null }

export default function AdminReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.id as string

  const [report, setReport] = useState<ReportWithSummary | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const [reportResponse, expensesResponse] = await Promise.all([
          fetch(`/api/admin/reports/${reportId}`),
          fetch(`/api/admin/reports/${reportId}/expenses`),
        ])

        if (!reportResponse.ok) {
          if (reportResponse.status === 404) {
            throw new Error('Report not found')
          }
          throw new Error('Failed to fetch report')
        }

        if (!expensesResponse.ok) {
          throw new Error('Failed to fetch expenses')
        }

        const reportData = await reportResponse.json()
        const expensesData = await expensesResponse.json()

        setReport(reportData)
        setExpenses(expensesData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [reportId])

  const handleActionSuccess = () => {
    router.refresh()
    router.push('/admin/approvals')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/admin/approvals">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Approvals
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">{error || 'Report not found'}</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/admin/approvals">Return to Approval Queue</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const canReview = report.status === 'submitted'
  const formattedTotal = `$${parseFloat(report.totalAmount || '0').toFixed(2)}`

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/approvals">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to approvals</span>
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight" data-testid="report-title">
              {report.name || 'Untitled Report'}
            </h1>
            <StatusBadge status={report.status} />
          </div>
          <p className="text-muted-foreground">Submitted by {report.userId.slice(0, 8)}...</p>
        </div>
        {canReview && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowRejectDialog(true)} data-testid="reject-report-button">
              <X className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button onClick={() => setShowApproveDialog(true)} data-testid="approve-report-button">
              <Check className="mr-2 h-4 w-4" />
              Approve
            </Button>
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
              <p className="mt-2 text-sm text-muted-foreground">
                Reviewed on {new Date(report.reviewedAt).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {report.status === 'approved' && report.reviewerComment && (
        <Card className="border-green-500" data-testid="approval-card">
          <CardHeader>
            <CardTitle className="text-green-700 dark:text-green-400">Approval Comment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{report.reviewerComment}</p>
            {report.reviewedAt && (
              <p className="mt-2 text-sm text-muted-foreground">
                Approved on {new Date(report.reviewedAt).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card data-testid="report-details-card">
        <CardHeader>
          <CardTitle>Report Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={report.status} />
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Expenses</dt>
              <dd className="mt-1 font-medium">{report.expenseCount}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Total Amount</dt>
              <dd className="mt-1 font-medium">{formattedTotal}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Submitted</dt>
              <dd className="mt-1">
                {report.submittedAt ? new Date(report.submittedAt).toLocaleDateString() : '-'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card data-testid="expenses-card">
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {expenses.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No expenses</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">Type</TableHead>
                    <TableHead className="w-[90px]">Date</TableHead>
                    <TableHead className="min-w-[200px]">Description</TableHead>
                    <TableHead className="w-[140px]">GL Account</TableHead>
                    <TableHead className="w-[110px]">Fund</TableHead>
                    <TableHead className="w-[90px] text-right">Amount</TableHead>
                    <TableHead className="w-[60px]">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id} data-testid={`expense-row-${expense.id}`}>
                      <TableCell>
                        {expense.type === 'mileage' ? (
                          <Car className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{new Date(expense.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="font-medium">{expense.merchant || '-'}</p>
                          {expense.memo && <p className="text-sm text-muted-foreground break-words">{expense.memo}</p>}
                          {expense.type === 'mileage' && expense.miles && (
                            <p className="text-sm text-muted-foreground">{expense.miles} miles</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{expense.glAccountName || expense.categoryName || '-'}</TableCell>
                      <TableCell>{expense.fundName || '-'}</TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        ${parseFloat(expense.amount || '0').toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {expense.receiptUrl ? (
                          <a
                            href={expense.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ApproveReportDialog
        reportId={reportId}
        reportName={report.name}
        open={showApproveDialog}
        onClose={() => setShowApproveDialog(false)}
        onSuccess={handleActionSuccess}
      />

      <RejectReportDialog
        reportId={reportId}
        reportName={report.name}
        open={showRejectDialog}
        onClose={() => setShowRejectDialog(false)}
        onSuccess={handleActionSuccess}
      />
    </div>
  )
}
