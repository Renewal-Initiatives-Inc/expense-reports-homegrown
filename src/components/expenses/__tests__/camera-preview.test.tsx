import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { CameraPreview } from '../camera-preview'

// Mock the useCamera hook
vi.mock('@/hooks/use-camera', () => ({
  useCamera: vi.fn(),
}))

// Mock camera-utils
vi.mock('@/lib/camera-utils', () => ({
  isMobileDevice: vi.fn(() => false),
}))

import { useCamera } from '@/hooks/use-camera'
import { isMobileDevice } from '@/lib/camera-utils'

describe('CameraPreview', () => {
  const mockOnCapture = vi.fn()
  const mockOnClose = vi.fn()
  const mockStartCamera = vi.fn()
  const mockStopCamera = vi.fn()
  const mockCaptureImage = vi.fn()
  const mockSwitchCamera = vi.fn()
  const mockVideoRef = { current: null }

  const defaultHookReturn = {
    videoRef: mockVideoRef,
    stream: null,
    isReady: false,
    isLoading: false,
    error: null,
    hasPermission: null,
    startCamera: mockStartCamera,
    stopCamera: mockStopCamera,
    captureImage: mockCaptureImage,
    switchCamera: mockSwitchCamera,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useCamera as ReturnType<typeof vi.fn>).mockReturnValue(defaultHookReturn)
    ;(isMobileDevice as ReturnType<typeof vi.fn>).mockReturnValue(false)
  })

  it('renders loading state while camera initializes', () => {
    ;(useCamera as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      isLoading: true,
    })

    render(<CameraPreview onCapture={mockOnCapture} onClose={mockOnClose} />)

    expect(screen.getByTestId('camera-loading')).toBeInTheDocument()
    expect(screen.getByText('Starting camera...')).toBeInTheDocument()
  })

  it('renders video element when camera is ready', () => {
    ;(useCamera as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      isReady: true,
      hasPermission: true,
      stream: {},
    })

    render(<CameraPreview onCapture={mockOnCapture} onClose={mockOnClose} />)

    expect(screen.getByTestId('camera-video')).toBeInTheDocument()
    expect(screen.getByTestId('camera-capture-button')).toBeInTheDocument()
  })

  it('calls onCapture with Blob when capture button is clicked', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/jpeg' })
    mockCaptureImage.mockResolvedValue(mockBlob)

    ;(useCamera as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      isReady: true,
      hasPermission: true,
      stream: {},
      captureImage: mockCaptureImage,
    })

    render(<CameraPreview onCapture={mockOnCapture} onClose={mockOnClose} />)

    const captureButton = screen.getByTestId('camera-capture-button')
    fireEvent.click(captureButton)

    await waitFor(() => {
      expect(mockCaptureImage).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(mockOnCapture).toHaveBeenCalledWith(mockBlob)
    })
  })

  it('shows flash effect on capture', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/jpeg' })
    mockCaptureImage.mockResolvedValue(mockBlob)

    ;(useCamera as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      isReady: true,
      hasPermission: true,
      stream: {},
      captureImage: mockCaptureImage,
    })

    render(<CameraPreview onCapture={mockOnCapture} onClose={mockOnClose} />)

    const captureButton = screen.getByTestId('camera-capture-button')
    fireEvent.click(captureButton)

    // Flash should appear briefly
    await waitFor(() => {
      expect(screen.getByTestId('camera-flash')).toBeInTheDocument()
    })
  })

  it('handles keyboard capture with Enter key', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/jpeg' })
    mockCaptureImage.mockResolvedValue(mockBlob)

    ;(useCamera as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      isReady: true,
      hasPermission: true,
      stream: {},
      captureImage: mockCaptureImage,
    })

    render(<CameraPreview onCapture={mockOnCapture} onClose={mockOnClose} />)

    fireEvent.keyDown(window, { key: 'Enter' })

    await waitFor(() => {
      expect(mockCaptureImage).toHaveBeenCalled()
    })
  })

  it('handles keyboard capture with Space key', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/jpeg' })
    mockCaptureImage.mockResolvedValue(mockBlob)

    ;(useCamera as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      isReady: true,
      hasPermission: true,
      stream: {},
      captureImage: mockCaptureImage,
    })

    render(<CameraPreview onCapture={mockOnCapture} onClose={mockOnClose} />)

    fireEvent.keyDown(window, { key: ' ' })

    await waitFor(() => {
      expect(mockCaptureImage).toHaveBeenCalled()
    })
  })

  it('handles Escape key to close', () => {
    ;(useCamera as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      isReady: true,
      hasPermission: true,
      stream: {},
    })

    render(<CameraPreview onCapture={mockOnCapture} onClose={mockOnClose} />)

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('displays permission error UI when camera error occurs', () => {
    ;(useCamera as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      error: 'PERMISSION_DENIED',
      hasPermission: false,
    })

    render(<CameraPreview onCapture={mockOnCapture} onClose={mockOnClose} />)

    expect(screen.getByTestId('camera-permission-error')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    ;(useCamera as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      isReady: true,
      hasPermission: true,
      stream: {},
    })

    render(<CameraPreview onCapture={mockOnCapture} onClose={mockOnClose} />)

    const closeButton = screen.getByTestId('camera-close-button')
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('shows switch camera button on mobile devices', () => {
    ;(isMobileDevice as ReturnType<typeof vi.fn>).mockReturnValue(true)
    ;(useCamera as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      isReady: true,
      hasPermission: true,
      stream: {},
    })

    render(<CameraPreview onCapture={mockOnCapture} onClose={mockOnClose} />)

    expect(screen.getByTestId('camera-switch-button')).toBeInTheDocument()
  })

  it('does not show switch camera button on desktop', () => {
    ;(isMobileDevice as ReturnType<typeof vi.fn>).mockReturnValue(false)
    ;(useCamera as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      isReady: true,
      hasPermission: true,
      stream: {},
    })

    render(<CameraPreview onCapture={mockOnCapture} onClose={mockOnClose} />)

    expect(screen.queryByTestId('camera-switch-button')).not.toBeInTheDocument()
  })

  it('disables capture button when disabled prop is true', () => {
    ;(useCamera as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      isReady: true,
      hasPermission: true,
      stream: {},
    })

    render(<CameraPreview onCapture={mockOnCapture} onClose={mockOnClose} disabled />)

    const captureButton = screen.getByTestId('camera-capture-button')
    expect(captureButton).toBeDisabled()
  })

  it('starts camera on mount', () => {
    render(<CameraPreview onCapture={mockOnCapture} onClose={mockOnClose} />)

    expect(mockStartCamera).toHaveBeenCalled()
  })

  it('stops camera on unmount', () => {
    const { unmount } = render(<CameraPreview onCapture={mockOnCapture} onClose={mockOnClose} />)

    unmount()

    expect(mockStopCamera).toHaveBeenCalled()
  })
})
