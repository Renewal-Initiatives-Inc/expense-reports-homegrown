'use client'

import { Button } from '@/components/ui/button'
import { DateRange, DateRangePicker } from '@/components/ui/date-range-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ReportStatus } from '@/lib/db/schema'
import { Filter, X } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

const statusOptions: { value: ReportStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export function ReportFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentStatus = searchParams.get('status') || 'all'
  const currentFrom = searchParams.get('from') || ''
  const currentTo = searchParams.get('to') || ''

  const hasActiveFilters = currentStatus !== 'all' || currentFrom || currentTo

  const createQueryString = useCallback(
    (params: Record<string, string | undefined>) => {
      const newParams = new URLSearchParams(searchParams.toString())

      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === '' || value === 'all') {
          newParams.delete(key)
        } else {
          newParams.set(key, value)
        }
      })

      return newParams.toString()
    },
    [searchParams]
  )

  const handleStatusChange = (value: string) => {
    const queryString = createQueryString({ status: value === 'all' ? undefined : value })
    router.push(`${pathname}${queryString ? `?${queryString}` : ''}`)
  }

  const handleDateRangeChange = (range: DateRange) => {
    const queryString = createQueryString({
      from: range.from,
      to: range.to,
    })
    router.push(`${pathname}${queryString ? `?${queryString}` : ''}`)
  }

  const handleClearFilters = () => {
    router.push(pathname)
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (currentStatus !== 'all') count++
    if (currentFrom || currentTo) count++
    return count
  }

  const activeCount = getActiveFilterCount()

  return (
    <div className="flex flex-wrap items-center gap-3" data-testid="report-filters">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span>Filter by:</span>
      </div>

      <Select value={currentStatus} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[150px]" data-testid="status-filter">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value} data-testid={`status-option-${option.value}`}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DateRangePicker
        value={{ from: currentFrom || undefined, to: currentTo || undefined }}
        onChange={handleDateRangeChange}
        className="w-[250px]"
      />

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-9" data-testid="clear-filters-button">
          <X className="mr-1 h-4 w-4" />
          Clear {activeCount > 1 ? `(${activeCount})` : ''}
        </Button>
      )}
    </div>
  )
}
