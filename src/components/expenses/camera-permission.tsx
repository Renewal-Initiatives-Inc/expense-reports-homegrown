'use client'

/**
 * Camera permission state UI with clear user guidance.
 */

import { Button } from '@/components/ui/button'
import type { CameraError } from '@/hooks/use-camera'
import { AlertCircle, Camera, Loader2, Upload } from 'lucide-react'

interface CameraPermissionProps {
  error: CameraError | null
  isLoading: boolean
  onRetry: () => void
  onFallbackToUpload: () => void
}

export function CameraPermission({ error, isLoading, onRetry, onFallbackToUpload }: CameraPermissionProps) {
  // Loading state
  if (isLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 text-center"
        data-testid="camera-permission-loading"
      >
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium">Requesting camera access...</p>
        <p className="mt-2 text-sm text-muted-foreground">Please allow camera access when prompted</p>
      </div>
    )
  }

  // Error states
  if (error) {
    const errorConfig = getErrorConfig(error)

    return (
      <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="camera-permission-error">
        <div className="mb-4 rounded-full bg-destructive/10 p-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <h3 className="text-lg font-medium">{errorConfig.title}</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{errorConfig.description}</p>
        <div className="mt-6 flex gap-3">
          {errorConfig.showRetry && (
            <Button variant="outline" onClick={onRetry} data-testid="camera-retry-button">
              <Camera className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
          <Button onClick={onFallbackToUpload} data-testid="camera-fallback-button">
            <Upload className="mr-2 h-4 w-4" />
            Upload File Instead
          </Button>
        </div>
        {error === 'PERMISSION_DENIED' && (
          <p className="mt-4 text-xs text-muted-foreground">
            To enable camera access, check your browser settings and reload the page.
          </p>
        )}
      </div>
    )
  }

  // Initial request state (before any action)
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="camera-permission-prompt">
      <div className="mb-4 rounded-full bg-primary/10 p-4">
        <Camera className="h-12 w-12 text-primary" />
      </div>
      <h3 className="text-lg font-medium">Camera Access Required</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        To capture receipts, we need permission to access your camera.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={onRetry} data-testid="camera-enable-button">
          <Camera className="mr-2 h-4 w-4" />
          Enable Camera
        </Button>
        <Button variant="outline" onClick={onFallbackToUpload} data-testid="camera-skip-button">
          <Upload className="mr-2 h-4 w-4" />
          Upload File Instead
        </Button>
      </div>
    </div>
  )
}

interface ErrorConfig {
  title: string
  description: string
  showRetry: boolean
}

function getErrorConfig(error: CameraError): ErrorConfig {
  switch (error) {
    case 'NOT_SUPPORTED':
      return {
        title: 'Camera Not Supported',
        description: "Your browser doesn't support camera access. Please use a modern browser or upload a file instead.",
        showRetry: false,
      }
    case 'PERMISSION_DENIED':
      return {
        title: 'Camera Access Denied',
        description: 'Camera permission was denied. You can upload a receipt file instead or update your browser settings.',
        showRetry: true,
      }
    case 'NOT_FOUND':
      return {
        title: 'No Camera Found',
        description: "We couldn't detect a camera on your device. Please connect a camera or upload a file instead.",
        showRetry: true,
      }
    case 'ALREADY_IN_USE':
      return {
        title: 'Camera In Use',
        description: 'Your camera is being used by another application. Please close other apps using the camera and try again.',
        showRetry: true,
      }
    case 'UNKNOWN':
    default:
      return {
        title: 'Camera Error',
        description: 'Something went wrong while accessing the camera. Please try again or upload a file instead.',
        showRetry: true,
      }
  }
}
