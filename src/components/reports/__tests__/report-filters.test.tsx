import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReportFilters } from '../report-filters'

// Mock next/navigation
const mockPush = vi.fn()
const mockPathname = '/reports'
let mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}))

describe('ReportFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams = new URLSearchParams()
  })

  it('renders filter controls', () => {
    render(<ReportFilters />)

    expect(screen.getByTestId('report-filters')).toBeInTheDocument()
    expect(screen.getByTestId('status-filter')).toBeInTheDocument()
    expect(screen.getByTestId('date-range-trigger')).toBeInTheDocument()
  })

  it('shows "All Statuses" by default', () => {
    render(<ReportFilters />)

    expect(screen.getByTestId('status-filter')).toHaveTextContent('All Statuses')
  })

  it('does not show clear button when no filters active', () => {
    render(<ReportFilters />)

    expect(screen.queryByTestId('clear-filters-button')).not.toBeInTheDocument()
  })

  it('shows clear button when status filter is active', () => {
    mockSearchParams = new URLSearchParams('status=open')
    render(<ReportFilters />)

    expect(screen.getByTestId('clear-filters-button')).toBeInTheDocument()
  })

  it('shows clear button when date filter is active', () => {
    mockSearchParams = new URLSearchParams('from=2025-01-01')
    render(<ReportFilters />)

    expect(screen.getByTestId('clear-filters-button')).toBeInTheDocument()
  })

  it('clears filters when clear button is clicked', async () => {
    const user = userEvent.setup()
    mockSearchParams = new URLSearchParams('status=open&from=2025-01-01')
    render(<ReportFilters />)

    const clearButton = screen.getByTestId('clear-filters-button')
    await user.click(clearButton)

    expect(mockPush).toHaveBeenCalledWith('/reports')
  })

  it('shows filter count when multiple filters active', () => {
    mockSearchParams = new URLSearchParams('status=open&from=2025-01-01')
    render(<ReportFilters />)

    const clearButton = screen.getByTestId('clear-filters-button')
    expect(clearButton).toHaveTextContent('(2)')
  })

  it('displays current status from URL params', () => {
    mockSearchParams = new URLSearchParams('status=submitted')
    render(<ReportFilters />)

    // The select should show "Submitted" (the current value)
    expect(screen.getByTestId('status-filter')).toHaveTextContent('Submitted')
  })

  it('shows both filters when date and status are set', () => {
    mockSearchParams = new URLSearchParams('status=approved&from=2025-01-01&to=2025-12-31')
    render(<ReportFilters />)

    expect(screen.getByTestId('status-filter')).toHaveTextContent('Approved')
    expect(screen.getByTestId('date-range-trigger')).toBeInTheDocument()
    expect(screen.getByTestId('clear-filters-button')).toBeInTheDocument()
  })

  it('shows correct clear count with date only filter', () => {
    mockSearchParams = new URLSearchParams('from=2025-01-01')
    render(<ReportFilters />)

    // Single filter should not show count in parentheses
    const clearButton = screen.getByTestId('clear-filters-button')
    expect(clearButton.textContent).not.toContain('(')
  })
})
