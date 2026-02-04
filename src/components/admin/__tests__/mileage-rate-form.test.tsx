import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MileageRateForm } from '../mileage-rate-form'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('MileageRateForm', () => {
  const defaultProps = {
    currentRate: 0.7,
    currentEffectiveDate: '2025-01-01',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('renders current rate and effective date', () => {
    render(<MileageRateForm {...defaultProps} />)

    expect(screen.getByTestId('current-rate-display')).toHaveTextContent('$0.70')
    expect(screen.getByTestId('effective-date-display')).toBeInTheDocument()
  })

  it('renders form inputs with current values', () => {
    render(<MileageRateForm {...defaultProps} />)

    const rateInput = screen.getByTestId('rate-input') as HTMLInputElement
    const dateInput = screen.getByTestId('effective-date-input') as HTMLInputElement

    expect(rateInput.value).toBe('0.7')
    expect(dateInput.value).toBe('2025-01-01')
  })

  it('save button is disabled when no changes made', () => {
    render(<MileageRateForm {...defaultProps} />)

    const saveButton = screen.getByTestId('save-button')
    expect(saveButton).toBeDisabled()
  })

  it('save button is enabled when rate changes', async () => {
    const user = userEvent.setup()
    render(<MileageRateForm {...defaultProps} />)

    const rateInput = screen.getByTestId('rate-input')
    await user.clear(rateInput)
    await user.type(rateInput, '0.75')

    const saveButton = screen.getByTestId('save-button')
    expect(saveButton).not.toBeDisabled()
  })

  it('shows reset button when changes are made', async () => {
    const user = userEvent.setup()
    render(<MileageRateForm {...defaultProps} />)

    expect(screen.queryByTestId('reset-button')).not.toBeInTheDocument()

    const rateInput = screen.getByTestId('rate-input')
    await user.clear(rateInput)
    await user.type(rateInput, '0.75')

    expect(screen.getByTestId('reset-button')).toBeInTheDocument()
  })

  it('reset button restores original values', async () => {
    const user = userEvent.setup()
    render(<MileageRateForm {...defaultProps} />)

    const rateInput = screen.getByTestId('rate-input') as HTMLInputElement
    await user.clear(rateInput)
    await user.type(rateInput, '0.75')

    expect(rateInput.value).toBe('0.75')

    const resetButton = screen.getByTestId('reset-button')
    await user.click(resetButton)

    expect(rateInput.value).toBe('0.7')
  })

  it('validates rate input has proper constraints', () => {
    render(<MileageRateForm {...defaultProps} />)

    const rateInput = screen.getByTestId('rate-input') as HTMLInputElement

    // Check that input has proper validation attributes
    expect(rateInput.min).toBe('0.01')
    expect(rateInput.max).toBe('10')
    expect(rateInput.step).toBe('0.01')
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ rate: 0.75, effectiveDate: '2025-01-01' }),
    })

    render(<MileageRateForm {...defaultProps} />)

    const rateInput = screen.getByTestId('rate-input')
    await user.clear(rateInput)
    await user.type(rateInput, '0.75')

    const saveButton = screen.getByTestId('save-button')
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/settings/mileage-rate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: 0.75, effectiveDate: '2025-01-01' }),
      })
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    let resolvePromise: (value: unknown) => void
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePromise = resolve
      })
    )

    render(<MileageRateForm {...defaultProps} />)

    const rateInput = screen.getByTestId('rate-input')
    await user.clear(rateInput)
    await user.type(rateInput, '0.75')

    const saveButton = screen.getByTestId('save-button')
    await user.click(saveButton)

    // During loading, button should be disabled
    expect(saveButton).toBeDisabled()

    // Clean up
    resolvePromise!({
      ok: true,
      json: () => Promise.resolve({ rate: 0.75, effectiveDate: '2025-01-01' }),
    })
  })

  it('shows error message on API failure', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Failed to update' }),
    })

    render(<MileageRateForm {...defaultProps} />)

    const rateInput = screen.getByTestId('rate-input')
    await user.clear(rateInput)
    await user.type(rateInput, '0.75')

    const saveButton = screen.getByTestId('save-button')
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to update')
    })
  })
})
