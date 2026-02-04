'use client'

/**
 * Hook to encapsulate WebRTC camera access, stream management, and permission handling.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { canvasToBlob, getOptimalVideoConstraints, isCameraSupported } from '@/lib/camera-utils'

export type CameraError =
  | 'NOT_SUPPORTED' // getUserMedia not available
  | 'PERMISSION_DENIED' // User denied camera access
  | 'NOT_FOUND' // No camera found
  | 'ALREADY_IN_USE' // Camera in use by another app
  | 'UNKNOWN' // Other errors

interface UseCameraOptions {
  facingMode?: 'user' | 'environment'
  onPermissionDenied?: () => void
}

interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement | null>
  stream: MediaStream | null
  isReady: boolean
  isLoading: boolean
  error: CameraError | null
  hasPermission: boolean | null
  startCamera: () => Promise<void>
  stopCamera: () => void
  captureImage: () => Promise<Blob | null>
  switchCamera: () => Promise<void>
}

/**
 * Map getUserMedia errors to CameraError type.
 */
function mapMediaError(error: unknown): CameraError {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'PERMISSION_DENIED'
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'NOT_FOUND'
      case 'NotReadableError':
      case 'TrackStartError':
        return 'ALREADY_IN_USE'
      default:
        return 'UNKNOWN'
    }
  }
  return 'UNKNOWN'
}

export function useCamera(options: UseCameraOptions = {}): UseCameraResult {
  const { facingMode: initialFacingMode = 'environment', onPermissionDenied } = options

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<CameraError | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>(initialFacingMode)

  /**
   * Stop all tracks and clean up stream.
   */
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setIsReady(false)
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [stream])

  /**
   * Start the camera with the current facing mode.
   */
  const startCamera = useCallback(async () => {
    // Clean up existing stream first
    stopCamera()

    if (!isCameraSupported()) {
      setError('NOT_SUPPORTED')
      setHasPermission(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const constraints = getOptimalVideoConstraints(currentFacingMode)
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)

      setStream(mediaStream)
      setHasPermission(true)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream

        // Wait for video to be ready
        await new Promise<void>((resolve) => {
          const video = videoRef.current!
          video.onloadedmetadata = () => {
            video.play().then(() => {
              setIsReady(true)
              resolve()
            })
          }
        })
      }
    } catch (err) {
      const cameraError = mapMediaError(err)
      setError(cameraError)
      setHasPermission(cameraError !== 'PERMISSION_DENIED' ? hasPermission : false)

      if (cameraError === 'PERMISSION_DENIED' && onPermissionDenied) {
        onPermissionDenied()
      }
    } finally {
      setIsLoading(false)
    }
  }, [currentFacingMode, onPermissionDenied, stopCamera, hasPermission])

  /**
   * Capture the current video frame as a JPEG Blob.
   */
  const captureImage = useCallback(async (): Promise<Blob | null> => {
    if (!videoRef.current || !isReady) {
      return null
    }

    const video = videoRef.current
    const canvas = document.createElement('canvas')

    // Use the actual video dimensions
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return null
    }

    // Draw the current video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert to blob
    try {
      const blob = await canvasToBlob(canvas, 0.9)
      return blob
    } catch {
      return null
    }
  }, [isReady])

  /**
   * Switch between front and rear cameras.
   */
  const switchCamera = useCallback(async () => {
    const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment'
    setCurrentFacingMode(newFacingMode)

    // Restart camera with new facing mode
    if (stream) {
      stopCamera()
    }
  }, [currentFacingMode, stopCamera, stream])

  // When facing mode changes, restart camera if it was running
  useEffect(() => {
    if (hasPermission === true && !stream && !isLoading) {
      startCamera()
    }
  }, [currentFacingMode, hasPermission, stream, isLoading, startCamera])

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [stream])

  return {
    videoRef,
    stream,
    isReady,
    isLoading,
    error,
    hasPermission,
    startCamera,
    stopCamera,
    captureImage,
    switchCamera,
  }
}
