'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'
import { useFunds } from '@/hooks/use-funds'
import type { Expense } from '@/types/expenses'
import { AlertCircle, Calculator, Loader2, MapPin, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

const DEFAULT_FUND_ID = 1 // General Fund (Unrestricted)

interface MileageExpenseFormProps {
  reportId: string
  expense?: Expense
  onSuccess?: () => void
  onCancel?: () => void
}

interface DistanceResult {
  miles: number
  amount: number
  rate: number
  effectiveDate: string
  formatted: {
    origin: string
    destination: string
  }
}

export function MileageExpenseForm({ reportId, expense, onSuccess, onCancel }: MileageExpenseFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isCalculating, setIsCalculating] = useState(false)
  const { funds, isLoading: fundsLoading } = useFunds()

  const isEditMode = !!expense

  // Form state
  const [date, setDate] = useState(expense?.date || new Date().toISOString().split('T')[0])
  const [originAddress, setOriginAddress] = useState(expense?.originAddress || '')
  const [destinationAddress, setDestinationAddress] = useState(expense?.destinationAddress || '')
  const [waypoints, setWaypoints] = useState<string[]>([])
  const [miles, setMiles] = useState(expense?.miles || '')
  const [amount, setAmount] = useState(expense?.amount ? parseFloat(expense.amount).toFixed(2) : '')
  const [memo, setMemo] = useState(expense?.memo || '')
  const [fundId, setFundId] = useState(expense?.fundId?.toString() || DEFAULT_FUND_ID.toString())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [manualOverride, setManualOverride] = useState(false)
  const [calculatedMiles, setCalculatedMiles] = useState<number | null>(null)
  const [currentRate, setCurrentRate] = useState<number | null>(null)
  const [irsRate, setIrsRate] = useState<{ rate: number; effectiveDate: string } | null>(null)

  // Fetch current IRS mileage rate for display
  useEffect(() => {
    fetch('/api/settings/mileage-rate')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data?.rate) setIrsRate(data) })
      .catch(() => {})
  }, [])

  const selectedFund = funds.find((f) => f.id.toString() === fundId)

  const canCalculate = originAddress.length >= 5 && destinationAddress.length >= 5

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!date) {
      newErrors.date = 'Date is required'
    }

    if (!originAddress) {
      newErrors.originAddress = 'Origin address is required'
    }

    if (!destinationAddress) {
      newErrors.destinationAddress = 'Destination address is required'
    }

    const milesNum = parseFloat(miles)
    if (!miles || isNaN(milesNum) || milesNum <= 0) {
      newErrors.miles = 'Miles must be a positive number'
    } else if (milesNum > 999) {
      newErrors.miles = 'Maximum 999 miles per trip'
    }

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Amount must be calculated'
    }

    if (!fundId) {
      newErrors.fundId = 'Funding source is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const calculateDistance = async () => {
    if (!canCalculate) return

    setIsCalculating(true)
    setErrors({})

    try {
      const response = await fetch('/api/distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: originAddress,
          destination: destinationAddress,
          waypoints: waypoints.filter((w) => w.trim().length > 0),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to calculate distance')
      }

      const result: DistanceResult = await response.json()

      setMiles(result.miles.toFixed(2))
      setAmount(result.amount.toFixed(2))
      setCalculatedMiles(result.miles)
      setCurrentRate(result.rate)
      setManualOverride(false)

      setOriginAddress(result.formatted.origin)
      setDestinationAddress(result.formatted.destination)

      toast.success(`Distance calculated: ${result.miles} miles = $${result.amount.toFixed(2)}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to calculate distance'
      toast.error(message)
      setErrors({ calculation: message })
    } finally {
      setIsCalculating(false)
    }
  }

  const handleMilesChange = (value: string) => {
    setMiles(value)

    if (calculatedMiles !== null && parseFloat(value) !== calculatedMiles) {
      setManualOverride(true)
    }

    if (currentRate && value) {
      const milesNum = parseFloat(value)
      if (!isNaN(milesNum)) {
        setAmount((milesNum * currentRate).toFixed(2))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    startTransition(async () => {
      try {
        const payload = {
          type: 'mileage' as const,
          date,
          originAddress,
          destinationAddress,
          miles: parseFloat(miles),
          amount: parseFloat(amount),
          memo: memo || undefined,
          fundId: parseInt(fundId),
          fundName: selectedFund?.name || '',
        }

        const url = isEditMode ? `/api/reports/${reportId}/expenses/${expense.id}` : `/api/reports/${reportId}/expenses`

        const response = await fetch(url, {
          method: isEditMode ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || `Failed to ${isEditMode ? 'update' : 'create'} expense`)
        }

        toast.success(isEditMode ? 'Mileage expense updated successfully' : 'Mileage expense added successfully')

        if (onSuccess) {
          onSuccess()
        } else {
          router.refresh()
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred'
        toast.error(message)
      }
    })
  }

  const addWaypoint = () => {
    setWaypoints([...waypoints, ''])
  }

  const removeWaypoint = (index: number) => {
    setWaypoints(waypoints.filter((_, i) => i !== index))
  }

  const updateWaypoint = (index: number, value: string) => {
    const newWaypoints = [...waypoints]
    newWaypoints[index] = value
    setWaypoints(newWaypoints)
  }

  if (fundsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="mileage-expense-form">
      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="date">
          Date <span className="text-destructive">*</span>
        </Label>
        <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={isPending} data-testid="mileage-date" />
        {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
      </div>

      {/* Origin Address */}
      <div className="space-y-2">
        <Label htmlFor="origin">
          <MapPin className="mr-1 inline h-4 w-4" />
          Origin Address <span className="text-destructive">*</span>
        </Label>
        <AddressAutocomplete
          id="origin"
          value={originAddress}
          onChange={setOriginAddress}
          placeholder="Enter starting address"
          disabled={isPending}
          aria-invalid={!!errors.originAddress}
        />
        {errors.originAddress && <p className="text-sm text-destructive">{errors.originAddress}</p>}
      </div>

      {/* Waypoints */}
      {waypoints.map((waypoint, index) => (
        <div key={index} className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={`waypoint-${index}`}>
              <MapPin className="mr-1 inline h-4 w-4" />
              Stop {index + 1}
            </Label>
            <Button type="button" variant="ghost" size="icon-xs" onClick={() => removeWaypoint(index)} disabled={isPending}>
              <X className="h-4 w-4" />
              <span className="sr-only">Remove stop</span>
            </Button>
          </div>
          <AddressAutocomplete
            id={`waypoint-${index}`}
            value={waypoint}
            onChange={(value) => updateWaypoint(index, value)}
            placeholder="Enter stop address"
            disabled={isPending}
          />
        </div>
      ))}

      {/* Add Stop Button */}
      <Button type="button" variant="outline" size="sm" onClick={addWaypoint} disabled={isPending} className="w-full" data-testid="add-waypoint">
        <Plus className="mr-2 h-4 w-4" />
        Add Stop
      </Button>

      {/* Destination Address */}
      <div className="space-y-2">
        <Label htmlFor="destination">
          <MapPin className="mr-1 inline h-4 w-4" />
          Destination Address <span className="text-destructive">*</span>
        </Label>
        <AddressAutocomplete
          id="destination"
          value={destinationAddress}
          onChange={setDestinationAddress}
          placeholder="Enter ending address"
          disabled={isPending}
          aria-invalid={!!errors.destinationAddress}
        />
        {errors.destinationAddress && <p className="text-sm text-destructive">{errors.destinationAddress}</p>}
      </div>

      {/* Calculate Distance Button */}
      <Button
        type="button"
        variant="secondary"
        onClick={calculateDistance}
        disabled={!canCalculate || isPending || isCalculating}
        className="w-full"
        data-testid="calculate-distance"
      >
        {isCalculating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Calculating...
          </>
        ) : (
          <>
            <Calculator className="mr-2 h-4 w-4" />
            Calculate Distance
          </>
        )}
      </Button>
      {errors.calculation && <p className="text-sm text-destructive">{errors.calculation}</p>}
      {irsRate && !currentRate && (
        <p className="text-sm text-muted-foreground">
          Current IRS mileage rate: ${irsRate.rate.toFixed(2)}/mile (effective {new Date(irsRate.effectiveDate).toLocaleDateString()})
        </p>
      )}

      {/* Miles and Amount (shown after calculation or for edit) */}
      {(miles || isEditMode) && (
        <div className="rounded-lg border bg-muted/50 p-4 space-y-4">
          {/* Miles */}
          <div className="space-y-2">
            <Label htmlFor="miles">
              Miles <span className="text-destructive">*</span>
            </Label>
            <Input
              id="miles"
              type="number"
              step="0.01"
              min="0.01"
              max="999"
              value={miles}
              onChange={(e) => handleMilesChange(e.target.value)}
              disabled={isPending}
              data-testid="mileage-miles"
            />
            {manualOverride && (
              <p className="flex items-center text-sm text-amber-600">
                <AlertCircle className="mr-1 h-4 w-4" />
                Distance manually adjusted from calculated value
              </p>
            )}
            {errors.miles && <p className="text-sm text-destructive">{errors.miles}</p>}
          </div>

          {/* Amount (display only) */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold">${amount || '0.00'}</span>
              {currentRate && <span className="text-sm text-muted-foreground">@ ${currentRate.toFixed(2)}/mile</span>}
            </div>
            {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
          </div>
        </div>
      )}

      {/* Memo */}
      <div className="space-y-2">
        <Label htmlFor="memo">Trip Purpose / Memo</Label>
        <Textarea
          id="memo"
          placeholder="e.g., Site visit to Easthampton property"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          maxLength={500}
          rows={2}
          disabled={isPending}
          data-testid="mileage-memo"
        />
      </div>

      {/* Funding Source */}
      <div className="space-y-2">
        <Label htmlFor="fund">
          Funding Source <span className="text-destructive">*</span>
        </Label>
        <Select value={fundId} onValueChange={setFundId} disabled={isPending}>
          <SelectTrigger className="w-full" data-testid="mileage-fund">
            <SelectValue placeholder="Select a funding source" />
          </SelectTrigger>
          <SelectContent>
            {funds.map((fund) => (
              <SelectItem key={fund.id} value={fund.id.toString()}>
                {fund.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.fundId && <p className="text-sm text-destructive">{errors.fundId}</p>}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending} data-testid="cancel-mileage">
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isPending || !miles} data-testid="submit-mileage">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : isEditMode ? (
            'Save Changes'
          ) : (
            'Add Mileage Expense'
          )}
        </Button>
      </div>
    </form>
  )
}
