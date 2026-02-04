import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ScanningStation } from '../scanning-station'

// Mock CameraPreview component
vi.mock('../camera-preview', () => ({
  CameraPreview: vi.fn(({ onCapture, onClose }) => (
    <div data-testid="mock-camera-preview">
      <button data-testid="mock-capture" onClick={() => onCapture(new Blob(['test'], { type: 'image/jpeg' }))}>
        Capture
      </button>
      <button data-testid="mock-close" onClick={onClose}>
        Close
      </button>
    </div>
  )),
}))

// Mock useReceiptProcessing hook
vi.mock('@/hooks/use-receipt-processing', () => ({
  useReceiptProcessing: vi.fn(),
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

import { useReceiptProcessing } from '@/hooks/use-receipt-processing'

describe('ScanningStation', () => {
  const mockOnClose = vi.fn()
  const mockOnCaptureComplete = vi.fn()
  const mockProcessReceipt = vi.fn()
  const mockReset = vi.fn()

  const defaultReceiptProcessingReturn = {
    processReceipt: mockProcessReceipt,
    result: null,
    error: null,
    reset: mockReset,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useReceiptProcessing as ReturnType<typeof vi.fn>).mockReturnValue(defaultReceiptProcessingReturn)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://example.com/receipt.jpg' }),
    })
  })

  it('opens modal when open prop is true', () => {
    render(<ScanningStation open={true} onClose={mockOnClose} onCaptureComplete={mockOnCaptureComplete} />)

    expect(screen.getByTestId('scanning-station')).toBeInTheDocument()
  })

  it('does not render when open prop is false', () => {
    render(<ScanningStation open={false} onClose={mockOnClose} onCaptureComplete={mockOnCaptureComplete} />)

    expect(screen.queryByTestId('scanning-station')).not.toBeInTheDocument()
  })

  it('shows camera preview by default', () => {
    render(<ScanningStation open={true} onClose={mockOnClose} onCaptureComplete={mockOnCaptureComplete} />)

    expect(screen.getByTestId('mock-camera-preview')).toBeInTheDocument()
  })

  it('transitions to uploading state when capture button is clicked', async () => {
    render(<ScanningStation open={true} onClose={mockOnClose} onCaptureComplete={mockOnCaptureComplete} />)

    const captureButton = screen.getByTestId('mock-capture')
    fireEvent.click(captureButton)

    await waitFor(() => {
      expect(screen.getByText(/Uploading image/i)).toBeInTheDocument()
    })
  })

  it('transitions to processing state after upload', async () => {
    render(<ScanningStation open={true} onClose={mockOnClose} onCaptureComplete={mockOnCaptureComplete} />)

    const captureButton = screen.getByTestId('mock-capture')
    fireEvent.click(captureButton)

    await waitFor(() => {
      expect(mockProcessReceipt).toHaveBeenCalledWith('https://example.com/receipt.jpg')
    })
  })

  it('displays extraction results in review state', async () => {
    const extractionResult = {
      merchant: 'Starbucks',
      amount: '12.50',
      date: '2026-02-03',
      suggestedCategoryId: 'cat1',
      suggestedCategoryName: 'Meals',
      memo: null,
      confidence: {
        merchant: 0.9,
        amount: 0.95,
        date: 0.9,
        category: 0.85,
      },
    }

    ;(useReceiptProcessing as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultReceiptProcessingReturn,
      result: extractionResult,
    })

    render(<ScanningStation open={true} onClose={mockOnClose} onCaptureComplete={mockOnCaptureComplete} />)

    const captureButton = screen.getByTestId('mock-capture')
    fireEvent.click(captureButton)

    await waitFor(() => {
      expect(screen.getByTestId('scanning-review')).toBeInTheDocument()
    })

    expect(screen.getByText('Starbucks')).toBeInTheDocument()
    expect(screen.getByText('$12.50')).toBeInTheDocument()
  })

  it('Add Another resets to camera state', async () => {
    ;(useReceiptProcessing as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultReceiptProcessingReturn,
      result: {
        merchant: 'Test',
        amount: '10.00',
        date: '2026-02-03',
        suggestedCategoryId: null,
        suggestedCategoryName: null,
        memo: null,
        confidence: { merchant: 0.9, amount: 0.9, date: 0.9, category: 0.5 },
      },
    })

    render(<ScanningStation open={true} onClose={mockOnClose} onCaptureComplete={mockOnCaptureComplete} />)

    // Trigger capture
    fireEvent.click(screen.getByTestId('mock-capture'))

    await waitFor(() => {
      expect(screen.getByTestId('scanning-review')).toBeInTheDocument()
    })

    // Click Add Another
    fireEvent.click(screen.getByTestId('scanning-add-another-button'))

    await waitFor(() => {
      expect(screen.getByTestId('mock-camera-preview')).toBeInTheDocument()
    })

    expect(mockOnCaptureComplete).toHaveBeenCalled()
    expect(mockReset).toHaveBeenCalled()
  })

  it('Done closes modal and calls callback', async () => {
    ;(useReceiptProcessing as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultReceiptProcessingReturn,
      result: {
        merchant: 'Test',
        amount: '10.00',
        date: '2026-02-03',
        suggestedCategoryId: null,
        suggestedCategoryName: null,
        memo: null,
        confidence: { merchant: 0.9, amount: 0.9, date: 0.9, category: 0.5 },
      },
    })

    render(<ScanningStation open={true} onClose={mockOnClose} onCaptureComplete={mockOnCaptureComplete} />)

    // Trigger capture
    fireEvent.click(screen.getByTestId('mock-capture'))

    await waitFor(() => {
      expect(screen.getByTestId('scanning-review')).toBeInTheDocument()
    })

    // Click Done
    fireEvent.click(screen.getByTestId('scanning-done-button'))

    expect(mockOnCaptureComplete).toHaveBeenCalled()
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('Retake Photo resets to camera without calling callback', async () => {
    ;(useReceiptProcessing as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultReceiptProcessingReturn,
      result: {
        merchant: 'Test',
        amount: '10.00',
        date: '2026-02-03',
        suggestedCategoryId: null,
        suggestedCategoryName: null,
        memo: null,
        confidence: { merchant: 0.9, amount: 0.9, date: 0.9, category: 0.5 },
      },
    })

    render(<ScanningStation open={true} onClose={mockOnClose} onCaptureComplete={mockOnCaptureComplete} />)

    // Trigger capture
    fireEvent.click(screen.getByTestId('mock-capture'))

    await waitFor(() => {
      expect(screen.getByTestId('scanning-review')).toBeInTheDocument()
    })

    // Click Retake
    fireEvent.click(screen.getByTestId('scanning-retake-button'))

    await waitFor(() => {
      expect(screen.getByTestId('mock-camera-preview')).toBeInTheDocument()
    })

    // Should not call onCaptureComplete when retaking
    expect(mockOnCaptureComplete).not.toHaveBeenCalled()
  })

  it('shows error state when upload fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Upload failed' }),
    })

    render(<ScanningStation open={true} onClose={mockOnClose} onCaptureComplete={mockOnCaptureComplete} />)

    // Trigger capture
    fireEvent.click(screen.getByTestId('mock-capture'))

    await waitFor(() => {
      expect(screen.getByTestId('scanning-error')).toBeInTheDocument()
    })

    expect(screen.getByText('Upload Failed')).toBeInTheDocument()
  })

  it('provides fallback to file upload on error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Upload failed' }),
    })

    render(<ScanningStation open={true} onClose={mockOnClose} onCaptureComplete={mockOnCaptureComplete} />)

    // Trigger capture
    fireEvent.click(screen.getByTestId('mock-capture'))

    await waitFor(() => {
      expect(screen.getByTestId('scanning-error')).toBeInTheDocument()
    })

    // Click fallback button
    fireEvent.click(screen.getByTestId('scanning-fallback-button'))

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('shows extraction error message when extraction fails', async () => {
    ;(useReceiptProcessing as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultReceiptProcessingReturn,
      error: 'Could not extract data',
    })

    render(<ScanningStation open={true} onClose={mockOnClose} onCaptureComplete={mockOnCaptureComplete} />)

    // Trigger capture
    fireEvent.click(screen.getByTestId('mock-capture'))

    await waitFor(() => {
      expect(screen.getByTestId('scanning-review')).toBeInTheDocument()
    })

    expect(screen.getByText('Could not extract data')).toBeInTheDocument()
  })

  it('closes modal when close button is clicked', () => {
    render(<ScanningStation open={true} onClose={mockOnClose} onCaptureComplete={mockOnCaptureComplete} />)

    const closeButton = screen.getByTestId('mock-close')
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })
})
