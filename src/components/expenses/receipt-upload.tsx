'use client'

import { Button } from '@/components/ui/button'
import { getAcceptString, getMaxFileSize } from '@/lib/blob'
import { ImageIcon, Loader2, Trash2, Upload } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useRef, useState } from 'react'

interface ReceiptUploadProps {
  value?: string | null
  onChange: (url: string | null) => void
  disabled?: boolean
}

export function ReceiptUpload({ value, onChange, disabled }: ReceiptUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const maxSizeMB = getMaxFileSize() / (1024 * 1024)

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

  if (value) {
    return (
      <div className="space-y-2">
        <div className="relative aspect-[4/3] w-full max-w-xs overflow-hidden rounded-lg border bg-muted">
          <Image src={value} alt="Receipt" fill className="object-contain" sizes="(max-width: 320px) 100vw, 320px" />
        </div>
        <div className="flex gap-2">
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
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div
        className={`flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
          dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
        } ${disabled || isUploading ? 'cursor-not-allowed opacity-50' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && !isUploading && inputRef.current?.click()}
        data-testid="receipt-dropzone"
      >
        {isUploading ? (
          <>
            <Loader2 className="mb-2 h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </>
        ) : (
          <>
            <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Drop receipt here or click to upload</p>
            <p className="text-xs text-muted-foreground">JPEG, PNG, GIF, WebP, HEIC (max {maxSizeMB}MB)</p>
          </>
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
    </div>
  )
}
