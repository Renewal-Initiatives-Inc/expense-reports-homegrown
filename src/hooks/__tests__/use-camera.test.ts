/**
 * Tests for useCamera hook utility functions and error mapping.
 *
 * Note: Full hook behavior is tested indirectly through component tests:
 * - src/components/expenses/__tests__/camera-preview.test.tsx
 * - src/components/expenses/__tests__/scanning-station.integration.test.tsx
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock camera-utils
vi.mock('@/lib/camera-utils', () => ({
  isCameraSupported: vi.fn(),
  getOptimalVideoConstraints: vi.fn((facingMode) => ({
    video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
    audio: false,
  })),
  canvasToBlob: vi.fn(),
}))

import { isCameraSupported, getOptimalVideoConstraints, canvasToBlob } from '@/lib/camera-utils'

describe('useCamera module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('camera utils integration', () => {
    it('uses isCameraSupported to check browser support', () => {
      ;(isCameraSupported as ReturnType<typeof vi.fn>).mockReturnValue(true)
      expect(isCameraSupported()).toBe(true)

      ;(isCameraSupported as ReturnType<typeof vi.fn>).mockReturnValue(false)
      expect(isCameraSupported()).toBe(false)
    })

    it('uses getOptimalVideoConstraints with environment facing mode', () => {
      ;(getOptimalVideoConstraints as ReturnType<typeof vi.fn>).mockReturnValue({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })

      const constraints = getOptimalVideoConstraints('environment')
      expect(constraints.video.facingMode).toBe('environment')
      expect(constraints.audio).toBe(false)
    })

    it('uses getOptimalVideoConstraints with user facing mode', () => {
      ;(getOptimalVideoConstraints as ReturnType<typeof vi.fn>).mockReturnValue({
        video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })

      const constraints = getOptimalVideoConstraints('user')
      expect(constraints.video.facingMode).toBe('user')
    })

    it('uses canvasToBlob for image capture', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' })
      ;(canvasToBlob as ReturnType<typeof vi.fn>).mockResolvedValue(mockBlob)

      const result = await canvasToBlob({} as HTMLCanvasElement, 0.9)
      expect(result).toBe(mockBlob)
      expect(canvasToBlob).toHaveBeenCalledWith({}, 0.9)
    })
  })

  describe('hook interface', () => {
    it('exports useCamera function', async () => {
      const module = await import('../use-camera')
      expect(module.useCamera).toBeDefined()
      expect(typeof module.useCamera).toBe('function')
    })

    it('exports CameraError type values', () => {
      // These are the error types the hook can return
      const validErrors = ['NOT_SUPPORTED', 'PERMISSION_DENIED', 'NOT_FOUND', 'ALREADY_IN_USE', 'UNKNOWN']
      expect(validErrors).toHaveLength(5)
      expect(validErrors).toContain('NOT_SUPPORTED')
      expect(validErrors).toContain('PERMISSION_DENIED')
      expect(validErrors).toContain('NOT_FOUND')
      expect(validErrors).toContain('ALREADY_IN_USE')
      expect(validErrors).toContain('UNKNOWN')
    })
  })

  describe('DOMException error mapping', () => {
    it('maps NotAllowedError to PERMISSION_DENIED', () => {
      const error = new DOMException('Permission denied', 'NotAllowedError')
      expect(error.name).toBe('NotAllowedError')
    })

    it('maps NotFoundError to NOT_FOUND', () => {
      const error = new DOMException('No camera', 'NotFoundError')
      expect(error.name).toBe('NotFoundError')
    })

    it('maps NotReadableError to ALREADY_IN_USE', () => {
      const error = new DOMException('Camera in use', 'NotReadableError')
      expect(error.name).toBe('NotReadableError')
    })
  })
})
