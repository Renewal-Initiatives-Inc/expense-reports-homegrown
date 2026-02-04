'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ExpenseReportSummary } from '@/types/reports'
import { Eye, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type PendingReport = ExpenseReportSummary & { submittedAt: Date | null }
type ReviewedReport = ExpenseReportSummary & { submittedAt: Date | null; reviewedAt: Date | null }

export default function AdminApprovalsPage() {
  const [activeTab, setActiveTab] = useState('pending')
  const [pendingReports, setPendingReports] = useState<PendingReport[]>([])
  const [reviewedReports, setReviewedReports] = useState<ReviewedReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const filter = activeTab === 'pending' ? 'pending' : 'reviewed'
        const response = await fetch(`/api/admin/reports?filter=${filter}`)

        if (!response.ok) {
          throw new Error('Failed to fetch reports')
        }

        const data = await response.json()

        if (activeTab === 'pending') {
          setPendingReports(data)
        } else {
          setReviewedReports(data)
        }
      } catch {
        setError('Failed to load reports')
      } finally {
        setIsLoading(false)
      }
    }

    fetchReports()
  }, [activeTab])

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString()
  }

  const formatAmount = (amount: string | null) => {
    return `$${parseFloat(amount || '0').toFixed(2)}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Approval Queue</h1>
        <p className="text-muted-foreground">Review and approve submitted expense reports</p>
      </div>

      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" data-testid="pending-tab">
            Pending
            {pendingReports.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingReports.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reviewed" data-testid="reviewed-tab">
            Recently Reviewed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card data-testid="pending-reports-card">
            <CardHeader>
              <CardTitle>Pending Approval</CardTitle>
              <CardDescription>Reports waiting for your review</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="py-8 text-center">
                  <p className="text-destructive">{error}</p>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('pending')} className="mt-2">
                    Try Again
                  </Button>
                </div>
              ) : pendingReports.length === 0 ? (
                <div className="py-12 text-center" data-testid="no-pending-reports">
                  <p className="text-muted-foreground">No reports pending approval</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submitted By</TableHead>
                      <TableHead>Report Name</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingReports.map((report) => (
                      <TableRow key={report.id} data-testid={`pending-report-${report.id}`}>
                        <TableCell className="font-medium">{report.userId.slice(0, 8)}...</TableCell>
                        <TableCell>
                          <Link
                            href={`/admin/approvals/${report.id}`}
                            className="hover:underline"
                            data-testid={`report-link-${report.id}`}
                          >
                            {report.name || 'Untitled Report'}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">{report.expenseCount}</TableCell>
                        <TableCell className="text-right">{formatAmount(report.totalAmount)}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(report.submittedAt)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild data-testid={`view-report-${report.id}`}>
                            <Link href={`/admin/approvals/${report.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Review
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviewed">
          <Card data-testid="reviewed-reports-card">
            <CardHeader>
              <CardTitle>Recently Reviewed</CardTitle>
              <CardDescription>Reports you have recently approved or rejected</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="py-8 text-center">
                  <p className="text-destructive">{error}</p>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('reviewed')} className="mt-2">
                    Try Again
                  </Button>
                </div>
              ) : reviewedReports.length === 0 ? (
                <div className="py-12 text-center" data-testid="no-reviewed-reports">
                  <p className="text-muted-foreground">No recently reviewed reports</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submitted By</TableHead>
                      <TableHead>Report Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Reviewed</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviewedReports.map((report) => (
                      <TableRow key={report.id} data-testid={`reviewed-report-${report.id}`}>
                        <TableCell className="font-medium">{report.userId.slice(0, 8)}...</TableCell>
                        <TableCell>{report.name || 'Untitled Report'}</TableCell>
                        <TableCell>
                          <StatusBadge status={report.status} />
                        </TableCell>
                        <TableCell className="text-right">{formatAmount(report.totalAmount)}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(report.reviewedAt)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/approvals/${report.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
