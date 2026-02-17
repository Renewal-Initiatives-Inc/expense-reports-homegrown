'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, Clock, CreditCard, FileCheck } from 'lucide-react'
import { useEffect, useState } from 'react'

interface StagingLineStatus {
  expenseId: string
  sourceRecordId: string
  status: string
  statusLabel: string
}

interface ReportFinancialStatus {
  lines: StagingLineStatus[]
  summary: string
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  received: <Clock className="h-3.5 w-3.5" />,
  posted: <FileCheck className="h-3.5 w-3.5" />,
  matched_to_payment: <CreditCard className="h-3.5 w-3.5" />,
  paid: <CheckCircle2 className="h-3.5 w-3.5" />,
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  received: 'secondary',
  posted: 'default',
  matched_to_payment: 'default',
  paid: 'default',
}

interface FinancialStatusCardProps {
  reportId: string
}

export function FinancialStatusCard({ reportId }: FinancialStatusCardProps) {
  const [status, setStatus] = useState<ReportFinancialStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/reports/${reportId}/financial-status`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setStatus(data)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [reportId])

  if (isLoading) {
    return (
      <Card data-testid="financial-status-card">
        <CardHeader>
          <CardTitle>Financial Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!status || status.lines.length === 0) {
    return null
  }

  return (
    <Card data-testid="financial-status-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Financial Status</span>
          <Badge variant="outline" className="text-xs">
            {status.summary}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {status.lines.map((line) => (
            <div key={line.expenseId} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-mono text-xs truncate max-w-[200px]">
                {line.sourceRecordId}
              </span>
              <Badge variant={STATUS_VARIANTS[line.status] || 'secondary'} className="gap-1">
                {STATUS_ICONS[line.status]}
                {line.statusLabel}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
