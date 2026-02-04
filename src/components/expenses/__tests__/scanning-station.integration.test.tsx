/**
 * Integration tests for the ScanningStation component.
 * These tests verify the full capture flow with mocked APIs.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { ScanningStation } from '../scanning-station'
import type { ReceiptExtractionResult } from '@/lib/receipt-extraction'

// Mock the camera hook with a controllable implementation
const mockStartCamera = vi.fn()
const mockStopCamera = vi.fn()
const mockCaptureImage = vi.fn()
const mockSwitchCamera = vi.fn()

vi.mock('@/hooks/use-camera', () => ({
  useCamera: vi.fn(() => ({
    videoRef: { current: document.createElement('video') },
    stream: { id: 'mock-stream' },
    isReady: true,
    isLoading: false,
    error: null,
    hasPermission: true,
    startCamera: mockStartCamera,
    stopCamera: mockStopCamera,
    captureImage: mockCaptureImage,
    switchCamera: mockSwitchCamera,
  })),
}))

// Mock camera utils
vi.mock('@/lib/camera-utils', () => ({
  isMobileDevice: vi.fn(() => false),
  isCameraSupported: vi.fn(() => true),
}))

// Mock categories hook
vi.mock('@/hooks/use-categories', () => ({
  useCategories: vi.fn(() => ({
    categories: [
      { id: 'meals', name: 'Meals' },
      { id: 'travel', name: 'Travel' },
      { id: 'supplies', name: 'Office Supplies' },
    ],
    isLoading: false,
  })),
}))

import { useCamera } from '@/hooks/use-camera'
import { isMobileDevice } from '@/lib/camera-utils'

describe('ScanningStation Integration Tests', () => {
  const mockOnClose = vi.fn()
  const mockOnCaptureComplete = vi.fn()

  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    // Default camera mock - ready state
    ;(useCamera as ReturnType<typeof vi.fn>).mockReturnValue({
      videoRef: { current: document.createElement('video') },
      stream: { id: 'mock-stream' },
      isReady: true,
      isLoading: false,
      error: null,
      hasPermission: true,
      startCamera: mockStartCamera,
      stopCamera: mockStopCamera,
      captureImage: mockCaptureImage,
      switchCamera: mockSwitchCamera,
    })

    // Mock fetch globally
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Full capture flow', () => {
    it('completes camera → capture → upload → extract → review flow', async () => {
      const mockBlob = new Blob(['test-image-data'], { type: 'image/jpeg' })
      mockCaptureImage.mockResolvedValue(mockBlob)

      // Mock upload response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            url: 'https://storage.example.com/receipt-123.jpg',
          }),
      })

      // Mock extraction response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              merchant: 'Coffee Shop',
              amount: '5.75',
              date: '2026-02-04',
              suggestedCategoryId: 'meals',
              suggestedCategoryName: 'Meals',
              memo: 'Coffee and pastry',
              confidence: {
                merchant: 0.95,
                amount: 0.98,
                date: 0.92,
                category: 0.87,
              },
            } as ReceiptExtractionResult,
          }),
      })

      render(<ScanningStation open={true} onClose={mockOnClose} onCaptureComplete={mockOnCaptureComplete} />)

      // Should show camera preview
      expect(screen.getByTestId('camera-preview')).toBeInTheDocument()

      // Capture photo
      const captureButton = screen.getByTestId('camera-capture-button')
      fireEvent.click(captureButton)

      // Should eventually show review state with extracted data
      // (intermediate uploading/processing states may transition too quickly to catch reliably)
      await waitFor(() => {
        expect(screen.getByTestId('scanning-review')).toBeInTheDocument()
      }, { timeout: 3000 })

      expect(screen.getByText('Coffee Shop')).toBeInTheDocument()
      expect(screen.getByText('$5.75')).toBeInTheDocument()

      // Complete the flow
      fireEvent.click(screen.getByTestId('scanning-done-button'))

      expect(mockOnCaptureComplete).toHaveBeenCalledWith({
        url: 'https://storage.example.com/receipt-123.jpg',
        thumbnailUrl: 'https://storage.example.com/receipt-123.jpg',
        extractionResult: expect.objectContaining({
          merchant: 'Coffee Shop',
          amount: '5.75',
        }),
      })
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Permission denied flow', () => {
    it('shows fallback to file upload when camera permission is denied', async () => {
      ;(useCamera as ReturnType<typeof vi.fn>).mockReturnValue({
        videoRef: { current: null },
        stream: null,
        isReady: false,
        isLoading: false,
        error: 'PERMISSION_DENIED',
        hasPermission: false,
        startCamera: mockStartCamera,
        stopCamera: mockStopCamera,
        captureImage: mockCaptureImage,
        switchCamera: mockSwitchCamera,
      })

      render(<ScanningStation open={true} onClose={mockOnClose} onCaptureComplete={mockOnCaptureComplete} />)

      // Should show permission error
      expect(screen.getByTestId('camera-permission-error')).toBeInTheDocument()
      expect(screen.getByText(/Camera Access Denied/i)).toBeInTheDocument()

      // Should have fallback button
      expect(screen.getByTestId('camera-fallback-button')).toBeInTheDocument()

      // Click fallback
      fireEvent.click(screen.getByTestId('camera-fallback-button'))

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Error handling', () => {
    it('shows retry option when upload fails', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' })
      mockCaptureImage.mockResolvedValue(mockBlob)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            error: 'Server error: File too large',
          }),
      })

      render(<ScanningStation open={true} onClose={mockOnClose} onCaptureComplete={mockOnCaptureComplete} />)

      // Capture photo
      fireEvent.click(screen.getByTestId('camera-capture-button'))

      // Should show error state
      await waitFor(() => {
        expect(screen.getByTestId('scanning-error')).toBeInTheDocument()
      })

      expect(screen.getByText(/Upload Failed/i)).toBeInTheDocument()
      expect(screen.getByTestId('scanning-retry-button')).toBeInTheDocument()
    })

    it('shows manual entry option when extraction fails', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' })
      mockCaptureImage.mockResolvedValue(mockBlob)

      // Mock upload success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            url: 'https://storage.example.com/receipt.jpg',
          }),
      })

      // Mock extraction failure
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Could not read receipt',
            code: 'UNREADABLE',
          }),
      })

      render(<ScanningStation open={true} onClose={mockOnClose} onCaptureComplete={mockOnCaptureComplete} />)

      // Capture photo
      fireEvent.click(screen.getByTestId('camera-capture-button'))

      // Should show review state with error message
      await waitFor(() => {
        expect(screen.getByTestId('scanning-review')).toBeInTheDocument()
      })

      expect(screen.getByText(/Could not extract data/i)).toBeInTheDocument()

      // User can still proceed with manual entry
      fireEvent.click(screen.getByTestId('scanning-done-button'))

      expect(mockOnCaptureComplete).toHaveBeenCalled()
    })
  })

  describe('Multiple captures', () => {
    it('enables batch receipt capture with add another flow', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' })
      mockCaptureImage.mockResolvedValue(mockBlob)

      // First capture
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ url: 'https://storage.example.com/receipt-1.jpg' }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              merchant: 'Store 1',
              amount: '10.00',
              date: '2026-02-04',
              suggestedCategoryId: null,
              suggestedCategoryName: null,
              memo: null,
              confidence: { merchant: 0.9, amount: 0.9, date: 0.9, category: 0.5 },
            },
          }),
      })

      // Second capture
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ url: 'https://storage.example.com/receipt-2.jpg' }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              merchant: 'Store 2',
              amount: '20.00',
              date: '2026-02-04',
              suggestedCategoryId: null,
              suggestedCategoryName: null,
              memo: null,
              confidence: { merchant: 0.9, amount: 0.9, date: 0.9, category: 0.5 },
            },
          }),
      })

      render(<ScanningStation open={true} onClose={mockOnClose} onCaptureComplete={mockOnCaptureComplete} />)

      // First capture
      fireEvent.click(screen.getByTestId('camera-capture-button'))

      await waitFor(() => {
        expect(screen.getByTestId('scanning-review')).toBeInTheDocument()
      })

      expect(screen.getByText('Store 1')).toBeInTheDocument()

      // Add another
      fireEvent.click(screen.getByTestId('scanning-add-another-button'))

      expect(mockOnCaptureComplete).toHaveBeenCalledTimes(1)
      expect(mockOnCaptureComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://storage.example.com/receipt-1.jpg',
        })
      )

      // Should reset to camera
      await waitFor(() => {
        expect(screen.getByTestId('camera-preview')).toBeInTheDocument()
      })

      // Second capture
      fireEvent.click(screen.getByTestId('camera-capture-button'))

      await waitFor(() => {
        expect(screen.getByTestId('scanning-review')).toBeInTheDocument()
      })

      expect(screen.getByText('Store 2')).toBeInTheDocument()

      // Done
      fireEvent.click(screen.getByTestId('scanning-done-button'))

      expect(mockOnCaptureComplete).toHaveBeenCalledTimes(2)
    })
  })

  describe('Accessibility', () => {
    it('has appropriate ARIA labels', () => {
      render(<ScanningStation open={true} onClose={mockOnClose} onCaptureComplete={mockOnCaptureComplete} />)

      expect(screen.getByLabelText('Capture photo')).toBeInTheDocument()
      expect(screen.getByLabelText('Close camera')).toBeInTheDocument()
    })

    it('supports keyboard navigation for capture', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' })
      mockCaptureImage.mockResolvedValue(mockBlob)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ url: 'https://storage.example.com/receipt.jpg' }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              merchant: 'Test',
              amount: '10.00',
              date: '2026-02-04',
              suggestedCategoryId: null,
              suggestedCategoryName: null,
              memo: null,
              confidence: { merchant: 0.9, amount: 0.9, date: 0.9, category: 0.5 },
            },
          }),
      })

      render(<ScanningStation open={true} onClose={mockOnClose} onCaptureComplete={mockOnCaptureComplete} />)

      // Press Enter to capture
      fireEvent.keyDown(window, { key: 'Enter' })

      await waitFor(() => {
        expect(mockCaptureImage).toHaveBeenCalled()
      })
    })
  })
})
