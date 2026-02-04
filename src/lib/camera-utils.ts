/**
 * Camera utility functions for browser detection and capability checking.
 */

/**
 * Check if the camera API (getUserMedia) is supported by the browser.
 */
export function isCameraSupported(): boolean {
  if (typeof window === 'undefined') return false
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
}

/**
 * Check if the device has at least one camera (async).
 */
export async function hasCamera(): Promise<boolean> {
  if (!isCameraSupported()) return false

  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.some((device) => device.kind === 'videoinput')
  } catch {
    return false
  }
}

/**
 * Get the current camera permission state.
 * Returns null if Permissions API is not supported.
 */
export async function getCameraPermission(): Promise<PermissionState | null> {
  if (typeof window === 'undefined') return null

  try {
    // Check if Permissions API is supported
    if (!navigator.permissions) return null

    const result = await navigator.permissions.query({ name: 'camera' as PermissionName })
    return result.state
  } catch {
    // Safari doesn't support camera permission query
    return null
  }
}

/**
 * Convert an HTMLCanvasElement to a Blob with specified quality.
 * @param canvas The canvas element to convert
 * @param quality JPEG quality (0-1), defaults to 0.9
 */
export function canvasToBlob(canvas: HTMLCanvasElement, quality: number = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to convert canvas to blob'))
        }
      },
      'image/jpeg',
      quality
    )
  })
}

/**
 * Check if the device is likely a mobile device.
 * Used to determine if camera switching should be available.
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

/**
 * Get the optimal video constraints for receipt capture.
 * Prefers rear camera on mobile devices with high resolution for OCR.
 */
export function getOptimalVideoConstraints(facingMode: 'user' | 'environment' = 'environment'): MediaStreamConstraints {
  return {
    video: {
      facingMode,
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false,
  }
}
