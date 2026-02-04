'use client'

/**
 * Live camera preview component with capture button and visual feedback.
 */

import { Button } from '@/components/ui/button'
import { useCamera } from '@/hooks/use-camera'
import { isMobileDevice } from '@/lib/camera-utils'
import { Camera, Loader2, RotateCcw, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { CameraPermission } from './camera-permission'

interface CameraPreviewProps {
  onCapture: (blob: Blob) => void
  onClose: () => void
  disabled?: boolean
}

export function CameraPreview({ onCapture, onClose, disabled = false }: CameraPreviewProps) {
  const { videoRef, isReady, isLoading, error, hasPermission, startCamera, stopCamera, captureImage, switchCamera } =
    useCamera()

  const [isCapturing, setIsCapturing] = useState(false)
  const [showFlash, setShowFlash] = useState(false)
  const showMobileControls = isMobileDevice()

  // Start camera on mount
  useEffect(() => {
    startCamera()

    return () => {
      stopCamera()
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCapture = useCallback(async () => {
    if (disabled || isCapturing || !isReady) return

    setIsCapturing(true)
    setShowFlash(true)

    // Flash effect duration
    setTimeout(() => setShowFlash(false), 200)

    try {
      const blob = await captureImage()
      if (blob) {
        onCapture(blob)
      }
    } finally {
      setIsCapturing(false)
    }
  }, [disabled, isCapturing, isReady, captureImage, onCapture])

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleCapture()
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleCapture, onClose])

  const handleFallbackToUpload = useCallback(() => {
    stopCamera()
    onClose()
  }, [stopCamera, onClose])

  // Show permission/error UI if needed
  if (error || (hasPermission === null && !isLoading && !isReady)) {
    return (
      <div className="flex h-full w-full flex-col bg-black">
        <div className="flex items-center justify-end p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
            aria-label="Close camera"
            data-testid="camera-close-button"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
        <div className="flex-1 bg-background">
          <CameraPermission
            error={error}
            isLoading={isLoading}
            onRetry={startCamera}
            onFallbackToUpload={handleFallbackToUpload}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full w-full flex-col bg-black" data-testid="camera-preview">
      {/* Close button */}
      <div className="absolute right-4 top-4 z-20">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20"
          aria-label="Close camera"
          data-testid="camera-close-button"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Video preview */}
      <div className="relative flex-1">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
          autoPlay
          aria-label="Camera preview"
          data-testid="camera-video"
        />

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50" data-testid="camera-loading">
            <div className="text-center text-white">
              <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin" />
              <p className="text-sm">Starting camera...</p>
            </div>
          </div>
        )}

        {/* Flash effect */}
        {showFlash && (
          <div
            className="pointer-events-none absolute inset-0 z-10 bg-white opacity-80 transition-opacity duration-200"
            aria-hidden="true"
            data-testid="camera-flash"
          />
        )}
      </div>

      {/* Controls */}
      <div className="bg-black/80 px-6 py-6 backdrop-blur-sm" data-testid="camera-controls">
        <div className="flex items-center justify-center gap-8">
          {/* Switch camera button (mobile only) */}
          {showMobileControls && (
            <Button
              variant="ghost"
              size="icon"
              onClick={switchCamera}
              disabled={disabled || isCapturing || !isReady}
              className="h-12 w-12 rounded-full text-white hover:bg-white/20"
              aria-label="Switch camera"
              data-testid="camera-switch-button"
            >
              <RotateCcw className="h-6 w-6" />
            </Button>
          )}

          {/* Capture button */}
          <button
            type="button"
            onClick={handleCapture}
            disabled={disabled || isCapturing || !isReady}
            className={`relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-white transition-transform ${
              isReady && !disabled && !isCapturing
                ? 'cursor-pointer hover:scale-105 active:scale-95'
                : 'cursor-not-allowed opacity-50'
            }`}
            aria-label="Capture photo"
            data-testid="camera-capture-button"
          >
            <div
              className={`h-12 w-12 rounded-full bg-white transition-colors ${
                isReady ? 'animate-pulse' : ''
              }`}
            />
            {isCapturing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className="h-6 w-6 text-primary" />
              </div>
            )}
          </button>

          {/* Placeholder for layout balance (mobile only) */}
          {showMobileControls && <div className="h-12 w-12" />}
        </div>

        {/* Instructions */}
        <p className="mt-4 text-center text-sm text-white/70">
          {isReady ? 'Press Space or Enter to capture' : 'Waiting for camera...'}
        </p>
      </div>

      {/* Screen reader announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        {isLoading && 'Camera is loading'}
        {isReady && 'Camera is ready. Press Space or Enter to capture.'}
        {isCapturing && 'Capturing photo'}
      </div>
    </div>
  )
}
