'use client'

import { Button } from '@/components/ui/button'
import { getAcceptString, getMaxFileSize } from '@/lib/blob'
import { isCameraSupported } from '@/lib/camera-utils'
import { Camera, FileText, ImageIcon, Loader2, Trash2, Upload } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ScanningStation } from './scanning-station'

interface CapturedReceipt {
  url: string
  thumbnailUrl: string
  extractionResult?: {
    merchant: string | null
    amount: string | null
    date: string | null
    suggestedCategoryId: string | null
    suggestedCategoryName: string | null
    memo: string | null
    confidence: {
      merchant: number
      amount: number
      date: number
      category: number
    }
  }
}

interface ReceiptUploadProps {
  value?: string | null
  onChange: (url: string | null) => void
  onExtractionResult?: (result: CapturedReceipt['extractionResult']) => void
  disabled?: boolean
}

export function ReceiptUpload({ value, onChange, onExtractionResult, disabled }: ReceiptUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [scanningOpen, setScanningOpen] = useState(false)
  const [cameraAvailable, setCameraAvailable] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const maxSizeMB = getMaxFileSize() / (1024 * 1024)

  // Check camera availability on mount
  useEffect(() => {
    setCameraAvailable(isCameraSupported())
  }, [])

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null)
      setIsUploading(true)

      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Upload failed')
        }

        const result = await response.json()
        onChange(result.url)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        setError(message)
      } finally {
        setIsUploading(false)
      }
    },
    [onChange]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleUpload(file)
      }
      // Reset input so same file can be selected again
      e.target.value = ''
    },
    [handleUpload]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)

      if (disabled || isUploading) return

      const file = e.dataTransfer.files?.[0]
      if (file) {
        handleUpload(file)
      }
    },
    [disabled, isUploading, handleUpload]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }, [])

  const handleRemove = useCallback(() => {
    onChange(null)
    setError(null)
  }, [onChange])

  const handleOpenScanning = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!disabled && !isUploading) {
        setScanningOpen(true)
      }
    },
    [disabled, isUploading]
  )

  const handleCaptureComplete = useCallback(
    (receipt: CapturedReceipt) => {
      onChange(receipt.url)
      if (receipt.extractionResult && onExtractionResult) {
        onExtractionResult(receipt.extractionResult)
      }
    },
    [onChange, onExtractionResult]
  )

  if (value) {
    const isDocument = (() => {
      try {
        const p = new URL(value).pathname.toLowerCase()
        return p.endsWith('.pdf') || p.endsWith('.html')
      } catch {
        const l = value.toLowerCase()
        return l.endsWith('.pdf') || l.endsWith('.html')
      }
    })()

    return (
      <div className="space-y-2">
        <div className="relative aspect-[4/3] w-full max-w-xs overflow-hidden rounded-lg border bg-muted">
          {isDocument ? (
            <a href={value} target="_blank" rel="noopener noreferrer" className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <FileText className="h-12 w-12 text-red-600" />
              <span className="text-sm">View Receipt</span>
            </a>
          ) : (
            <Image src={value} alt="Receipt" fill className="object-contain" sizes="(max-width: 320px) 100vw, 320px" />
          )}
        </div>
        <div className="flex gap-2">
          {cameraAvailable && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setScanningOpen(true)}
              disabled={disabled || isUploading}
              data-testid="retake-photo-button"
            >
              <Camera className="mr-2 h-4 w-4" />
              Retake
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || isUploading}
            data-testid="replace-receipt-button"
          >
            <Upload className="mr-2 h-4 w-4" />
            Replace
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={disabled}
            data-testid="remove-receipt-button"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={getAcceptString()}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />
        <ScanningStation open={scanningOpen} onClose={() => setScanningOpen(false)} onCaptureComplete={handleCaptureComplete} />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Two-column layout for camera and file upload */}
      <div
        className={`rounded-lg border-2 border-dashed p-4 transition-colors ${
          dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        } ${disabled || isUploading ? 'cursor-not-allowed opacity-50' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        data-testid="receipt-dropzone"
      >
        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-6">
            <Loader2 className="mb-2 h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {cameraAvailable && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenScanning}
                  disabled={disabled}
                  className="flex items-center gap-2"
                  data-testid="take-photo-button"
                >
                  <Camera className="h-5 w-5" />
                  <span>Take Photo</span>
                </Button>
              )}
              <span className="text-sm text-muted-foreground">{cameraAvailable ? 'or' : ''}</span>
              <Button
                type="button"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
                className="flex items-center gap-2"
                data-testid="choose-file-button"
              >
                <Upload className="h-5 w-5" />
                <span>Choose File</span>
              </Button>
            </div>

            {/* Drop zone hint */}
            <div className="flex flex-col items-center text-center">
              <ImageIcon className="mb-1 h-6 w-6 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">Drop receipt here</p>
              <p className="text-xs text-muted-foreground/70">JPEG, PNG, GIF, WebP, HEIC (max {maxSizeMB}MB)</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive" data-testid="upload-error">
          {error}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={getAcceptString()}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
        data-testid="receipt-input"
      />
      <ScanningStation open={scanningOpen} onClose={() => setScanningOpen(false)} onCaptureComplete={handleCaptureComplete} />
    </div>
  )
}
