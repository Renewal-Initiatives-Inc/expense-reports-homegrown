'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface MileageRateFormProps {
  currentRate: number
  currentEffectiveDate: string
}

export function MileageRateForm({ currentRate, currentEffectiveDate }: MileageRateFormProps) {
  const [rate, setRate] = useState(currentRate.toString())
  const [effectiveDate, setEffectiveDate] = useState(currentEffectiveDate)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasChanges = rate !== currentRate.toString() || effectiveDate !== currentEffectiveDate

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const rateNum = parseFloat(rate)

    if (isNaN(rateNum) || rateNum <= 0) {
      setError('Rate must be a positive number')
      return
    }

    if (rateNum > 10) {
      setError('Rate seems unusually high. Maximum allowed is $10.00/mile.')
      return
    }

    if (!effectiveDate) {
      setError('Effective date is required')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/settings/mileage-rate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: rateNum, effectiveDate }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update mileage rate')
      }

      toast.success('Mileage rate updated successfully')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update mileage rate'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setRate(currentRate.toString())
    setEffectiveDate(currentEffectiveDate)
    setError(null)
  }

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <Card data-testid="mileage-rate-card">
      <CardHeader>
        <CardTitle>IRS Mileage Rate</CardTitle>
        <CardDescription>Configure the reimbursement rate for mileage expenses. Changes apply to new expenses only.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 rounded-lg bg-muted p-4">
          <div className="text-sm text-muted-foreground">Current Rate</div>
          <div className="text-2xl font-bold" data-testid="current-rate-display">
            ${currentRate.toFixed(2)}
            <span className="text-base font-normal text-muted-foreground">/mile</span>
          </div>
          <div className="text-sm text-muted-foreground" data-testid="effective-date-display">
            Effective since {formatDisplayDate(currentEffectiveDate)}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rate">New Rate ($/mile)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="10"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="pl-7"
                  placeholder="0.70"
                  disabled={isLoading}
                  data-testid="rate-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="effectiveDate">Effective Date</Label>
              <Input
                id="effectiveDate"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                disabled={isLoading}
                data-testid="effective-date-input"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" data-testid="error-message">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading || !hasChanges} data-testid="save-button">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
            {hasChanges && (
              <Button type="button" variant="outline" onClick={handleReset} disabled={isLoading} data-testid="reset-button">
                Reset
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
