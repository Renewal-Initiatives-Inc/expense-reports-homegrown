import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  isCameraSupported,
  hasCamera,
  getCameraPermission,
  canvasToBlob,
  isMobileDevice,
  getOptimalVideoConstraints,
} from '../camera-utils'

describe('camera-utils', () => {
  describe('isCameraSupported', () => {
    const originalNavigator = global.navigator

    afterEach(() => {
      // Restore navigator
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
      })
    })

    it('returns true when getUserMedia is available', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          mediaDevices: {
            getUserMedia: vi.fn(),
          },
        },
        writable: true,
      })
      expect(isCameraSupported()).toBe(true)
    })

    it('returns false when mediaDevices is not available', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      })
      expect(isCameraSupported()).toBe(false)
    })

    it('returns false when getUserMedia is not available', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          mediaDevices: {},
        },
        writable: true,
      })
      expect(isCameraSupported()).toBe(false)
    })
  })

  describe('hasCamera', () => {
    const originalNavigator = global.navigator

    afterEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
      })
    })

    it('returns true when videoinput device exists', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          mediaDevices: {
            getUserMedia: vi.fn(),
            enumerateDevices: vi.fn().mockResolvedValue([
              { kind: 'videoinput', deviceId: 'camera1', label: 'Camera' },
            ]),
          },
        },
        writable: true,
      })
      expect(await hasCamera()).toBe(true)
    })

    it('returns false when no videoinput device exists', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          mediaDevices: {
            getUserMedia: vi.fn(),
            enumerateDevices: vi.fn().mockResolvedValue([
              { kind: 'audioinput', deviceId: 'mic1', label: 'Microphone' },
            ]),
          },
        },
        writable: true,
      })
      expect(await hasCamera()).toBe(false)
    })

    it('returns false when camera is not supported', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      })
      expect(await hasCamera()).toBe(false)
    })

    it('returns false when enumerateDevices throws', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          mediaDevices: {
            getUserMedia: vi.fn(),
            enumerateDevices: vi.fn().mockRejectedValue(new Error('Error')),
          },
        },
        writable: true,
      })
      expect(await hasCamera()).toBe(false)
    })
  })

  describe('getCameraPermission', () => {
    const originalNavigator = global.navigator

    afterEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
      })
    })

    it('returns permission state when available', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          permissions: {
            query: vi.fn().mockResolvedValue({ state: 'granted' }),
          },
        },
        writable: true,
      })
      expect(await getCameraPermission()).toBe('granted')
    })

    it('returns null when permissions API is not available', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      })
      expect(await getCameraPermission()).toBe(null)
    })

    it('returns null when query throws (Safari)', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          permissions: {
            query: vi.fn().mockRejectedValue(new Error('Not supported')),
          },
        },
        writable: true,
      })
      expect(await getCameraPermission()).toBe(null)
    })
  })

  describe('canvasToBlob', () => {
    it('converts canvas to JPEG blob', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' })
      const mockCanvas = {
        toBlob: vi.fn((callback) => callback(mockBlob)),
      } as unknown as HTMLCanvasElement

      const result = await canvasToBlob(mockCanvas, 0.9)
      expect(result).toBe(mockBlob)
      expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.9)
    })

    it('uses default quality of 0.9', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' })
      const mockCanvas = {
        toBlob: vi.fn((callback) => callback(mockBlob)),
      } as unknown as HTMLCanvasElement

      await canvasToBlob(mockCanvas)
      expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.9)
    })

    it('rejects when toBlob returns null', async () => {
      const mockCanvas = {
        toBlob: vi.fn((callback) => callback(null)),
      } as unknown as HTMLCanvasElement

      await expect(canvasToBlob(mockCanvas)).rejects.toThrow('Failed to convert canvas to blob')
    })
  })

  describe('isMobileDevice', () => {
    const originalNavigator = global.navigator

    afterEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
      })
    })

    it('returns true for iPhone user agent', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        },
        writable: true,
      })
      expect(isMobileDevice()).toBe(true)
    })

    it('returns true for Android user agent', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.127 Mobile Safari/537.36',
        },
        writable: true,
      })
      expect(isMobileDevice()).toBe(true)
    })

    it('returns false for desktop user agent', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        },
        writable: true,
      })
      expect(isMobileDevice()).toBe(false)
    })
  })

  describe('getOptimalVideoConstraints', () => {
    it('returns constraints with environment facing mode by default', () => {
      const constraints = getOptimalVideoConstraints()
      expect(constraints).toEqual({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
    })

    it('returns constraints with user facing mode when specified', () => {
      const constraints = getOptimalVideoConstraints('user')
      expect(constraints).toEqual({
        video: {
          facingMode: 'user',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
    })
  })
})
