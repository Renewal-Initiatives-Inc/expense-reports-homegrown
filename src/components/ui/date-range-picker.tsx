'use client'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { CalendarDays, X } from 'lucide-react'
import { useState } from 'react'

export interface DateRange {
  from?: string // YYYY-MM-DD format
  to?: string // YYYY-MM-DD format
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

type PresetKey = 'this-week' | 'this-month' | 'last-30' | 'this-year' | 'custom'

const presets: { key: PresetKey; label: string }[] = [
  { key: 'this-week', label: 'This Week' },
  { key: 'this-month', label: 'This Month' },
  { key: 'last-30', label: 'Last 30 Days' },
  { key: 'this-year', label: 'This Year' },
  { key: 'custom', label: 'Custom Range' },
]

function getPresetRange(preset: PresetKey): DateRange {
  const today = new Date()
  const formatDate = (d: Date) => d.toISOString().split('T')[0]

  switch (preset) {
    case 'this-week': {
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())
      return { from: formatDate(startOfWeek), to: formatDate(today) }
    }
    case 'this-month': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      return { from: formatDate(startOfMonth), to: formatDate(today) }
    }
    case 'last-30': {
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(today.getDate() - 30)
      return { from: formatDate(thirtyDaysAgo), to: formatDate(today) }
    }
    case 'this-year': {
      const startOfYear = new Date(today.getFullYear(), 0, 1)
      return { from: formatDate(startOfYear), to: formatDate(today) }
    }
    default:
      return {}
  }
}

function formatDisplayRange(range: DateRange): string {
  if (!range.from && !range.to) {
    return 'Select dates'
  }

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (range.from && range.to) {
    return `${formatDisplayDate(range.from)} - ${formatDisplayDate(range.to)}`
  }

  if (range.from) {
    return `From ${formatDisplayDate(range.from)}`
  }

  return `Until ${formatDisplayDate(range.to!)}`
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [activePreset, setActivePreset] = useState<PresetKey | null>(null)

  const handlePresetClick = (preset: PresetKey) => {
    setActivePreset(preset)
    if (preset !== 'custom') {
      const range = getPresetRange(preset)
      onChange(range)
      setOpen(false)
    }
  }

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setActivePreset('custom')
    onChange({ ...value, from: e.target.value || undefined })
  }

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setActivePreset('custom')
    onChange({ ...value, to: e.target.value || undefined })
  }

  const handleClear = () => {
    setActivePreset(null)
    onChange({})
    setOpen(false)
  }

  const hasSelection = value.from || value.to

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('w-[280px] justify-start text-left font-normal', !hasSelection && 'text-muted-foreground', className)}
          data-testid="date-range-trigger"
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          <span className="flex-1 truncate">{formatDisplayRange(value)}</span>
          {hasSelection && (
            <X
              className="ml-2 h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start" data-testid="date-range-popover">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.key}
                variant={activePreset === preset.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePresetClick(preset.key)}
                data-testid={`date-preset-${preset.key}`}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {(activePreset === 'custom' || hasSelection) && (
            <div className="grid gap-4 pt-2 border-t">
              <div className="grid gap-2">
                <Label htmlFor="date-from">From</Label>
                <input
                  id="date-from"
                  type="date"
                  value={value.from || ''}
                  onChange={handleFromChange}
                  max={value.to || undefined}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="date-from-input"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date-to">To</Label>
                <input
                  id="date-to"
                  type="date"
                  value={value.to || ''}
                  onChange={handleToChange}
                  min={value.from || undefined}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="date-to-input"
                />
              </div>
            </div>
          )}

          {hasSelection && (
            <div className="flex justify-end pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={handleClear} data-testid="date-clear-button">
                Clear dates
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
