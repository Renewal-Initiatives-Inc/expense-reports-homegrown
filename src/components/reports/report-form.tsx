'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createReportSchema } from '@/lib/validations/reports'
import type { ExpenseReport } from '@/types/reports'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

interface ReportFormProps {
  report?: ExpenseReport
  mode: 'create' | 'edit'
}

export function ReportForm({ report, mode }: ReportFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(report?.name || '')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const validationResult = createReportSchema.safeParse({ name: name || undefined })

    if (!validationResult.success) {
      setError(validationResult.error.issues[0]?.message || 'Validation failed')
      return
    }

    startTransition(async () => {
      try {
        const url = mode === 'create' ? '/api/reports' : `/api/reports/${report?.id}`
        const method = mode === 'create' ? 'POST' : 'PUT'

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name || undefined }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to save report')
        }

        const savedReport = await response.json()

        toast.success(mode === 'create' ? 'Report created successfully' : 'Report updated successfully')

        router.push(`/reports/${savedReport.id}`)
        router.refresh()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred'
        setError(message)
        toast.error(message)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card data-testid="report-form">
        <CardHeader>
          <CardTitle>{mode === 'create' ? 'New Expense Report' : 'Edit Expense Report'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Report Name</Label>
            <Input
              id="name"
              data-testid="report-name-input"
              placeholder="e.g., Cincinnati Trip"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
            <p className="text-sm text-muted-foreground">Leave blank to use default name (Report YYYY-MM-DD)</p>
          </div>
          {error && (
            <p className="text-sm text-destructive" data-testid="form-error">
              {error}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending} data-testid="cancel-button">
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} data-testid="submit-button">
            {isPending ? 'Saving...' : mode === 'create' ? 'Create Report' : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
