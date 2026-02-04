'use client'

/**
 * Full-screen modal for the receipt scanning workflow with batch capture support.
 */

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useReceiptProcessing } from '@/hooks/use-receipt-processing'
import type { ReceiptExtractionResult } from '@/lib/receipt-extraction'
import { AlertCircle, Camera, Check, Loader2, Plus, RotateCcw, Upload, X } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useState } from 'react'
import { CameraPreview } from './camera-preview'

type ScanningState =
  | 'CAMERA_READY'
  | 'CAPTURING'
  | 'UPLOADING'
  | 'PROCESSING'
  | 'REVIEW'
  | 'PROMPT_NEXT'
  | 'ERROR'

interface CapturedReceipt {
  url: string
  thumbnailUrl: string
  extractionResult?: ReceiptExtractionResult
}

interface ScanningStationProps {
  open: boolean
  onClose: () => void
  onCaptureComplete: (receipt: CapturedReceipt) => void
}

export function ScanningStation({ open, onClose, onCaptureComplete }: ScanningStationProps) {
  const [state, setState] = useState<ScanningState>('CAMERA_READY')
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const { processReceipt, result: extractionResult, error: extractionError, reset: resetExtraction } =
    useReceiptProcessing()

  const resetState = useCallback(() => {
    setState('CAMERA_READY')
    setCapturedImageUrl(null)
    setUploadError(null)
    resetExtraction()
  }, [resetExtraction])

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [resetState, onClose])

  const handleCapture = useCallback(
    async (blob: Blob) => {
      setState('UPLOADING')
      setUploadError(null)

      try {
        // Upload the image
        const formData = new FormData()
        formData.append('file', blob, 'receipt.jpg')

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadResponse.ok) {
          const data = await uploadResponse.json()
          throw new Error(data.error || 'Upload failed')
        }

        const uploadResult = await uploadResponse.json()
        setCapturedImageUrl(uploadResult.url)

        // Start processing
        setState('PROCESSING')
        await processReceipt(uploadResult.url)

        // Move to review state (extraction result will be handled by the hook)
        setState('REVIEW')
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed')
        setState('ERROR')
      }
    },
    [processReceipt]
  )

  const handleRetake = useCallback(() => {
    resetState()
  }, [resetState])

  const handleAddAnother = useCallback(() => {
    if (capturedImageUrl) {
      // Notify parent of completed capture
      onCaptureComplete({
        url: capturedImageUrl,
        thumbnailUrl: capturedImageUrl,
        extractionResult: extractionResult || undefined,
      })
    }
    // Reset for next capture
    resetState()
  }, [capturedImageUrl, extractionResult, onCaptureComplete, resetState])

  const handleDone = useCallback(() => {
    if (capturedImageUrl) {
      // Notify parent of completed capture
      onCaptureComplete({
        url: capturedImageUrl,
        thumbnailUrl: capturedImageUrl,
        extractionResult: extractionResult || undefined,
      })
    }
    handleClose()
  }, [capturedImageUrl, extractionResult, onCaptureComplete, handleClose])

  const handleFallbackToUpload = useCallback(() => {
    handleClose()
  }, [handleClose])

  // Render based on state
  const renderContent = () => {
    switch (state) {
      case 'CAMERA_READY':
        return <CameraPreview onCapture={handleCapture} onClose={handleClose} />

      case 'UPLOADING':
      case 'PROCESSING':
        return (
          <div className="flex h-full flex-col bg-black" data-testid="scanning-processing">
            <div className="flex items-center justify-end p-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="text-white hover:bg-white/20"
                aria-label="Close"
                data-testid="scanning-close-button"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
              {/* Preview thumbnail */}
              {capturedImageUrl && (
                <div className="relative aspect-[3/4] w-48 overflow-hidden rounded-lg border-2 border-white/20">
                  <Image
                    src={capturedImageUrl}
                    alt="Captured receipt"
                    fill
                    className="object-cover"
                    sizes="192px"
                  />
                </div>
              )}

              {/* Progress indicator */}
              <div className="text-center text-white">
                <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin" />
                <p className="text-lg font-medium">
                  {state === 'UPLOADING' ? 'Uploading image...' : 'Analyzing receipt...'}
                </p>
                <p className="mt-1 text-sm text-white/70">
                  {state === 'UPLOADING'
                    ? 'Please wait while we upload your receipt'
                    : 'AI is extracting data from your receipt'}
                </p>
              </div>
            </div>
          </div>
        )

      case 'REVIEW':
        return (
          <div className="flex h-full flex-col bg-background" data-testid="scanning-review">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-lg font-semibold">Receipt Captured!</h2>
              <Button variant="ghost" size="icon" onClick={handleClose} aria-label="Close" data-testid="scanning-close-button">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex flex-col gap-6 sm:flex-row">
                {/* Image preview */}
                {capturedImageUrl && (
                  <div className="relative aspect-[3/4] w-full flex-shrink-0 overflow-hidden rounded-lg border bg-muted sm:w-48">
                    <Image
                      src={capturedImageUrl}
                      alt="Captured receipt"
                      fill
                      className="object-contain"
                      sizes="(max-width: 640px) 100vw, 192px"
                    />
                  </div>
                )}

                {/* Extraction results */}
                <div className="flex-1">
                  {extractionResult ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-green-600">
                        <Check className="h-5 w-5" />
                        <span className="font-medium">Data extracted successfully</span>
                      </div>

                      <dl className="space-y-2">
                        {extractionResult.merchant && (
                          <div>
                            <dt className="text-sm font-medium text-muted-foreground">Merchant</dt>
                            <dd className="text-base">{extractionResult.merchant}</dd>
                          </div>
                        )}
                        {extractionResult.amount && (
                          <div>
                            <dt className="text-sm font-medium text-muted-foreground">Amount</dt>
                            <dd className="text-base">${extractionResult.amount}</dd>
                          </div>
                        )}
                        {extractionResult.date && (
                          <div>
                            <dt className="text-sm font-medium text-muted-foreground">Date</dt>
                            <dd className="text-base">{extractionResult.date}</dd>
                          </div>
                        )}
                        {extractionResult.suggestedCategoryName && (
                          <div>
                            <dt className="text-sm font-medium text-muted-foreground">Category</dt>
                            <dd className="text-base">{extractionResult.suggestedCategoryName}</dd>
                          </div>
                        )}
                      </dl>

                      <p className="text-sm text-muted-foreground">
                        Review and edit these details in the expense form
                      </p>
                    </div>
                  ) : extractionError ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-yellow-600">
                        <AlertCircle className="h-5 w-5" />
                        <span className="font-medium">Could not extract data</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        The receipt was captured but we couldn&apos;t read the data automatically. You can enter the
                        details manually in the expense form.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Processing...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t bg-muted/30 px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <Button variant="outline" onClick={handleRetake} data-testid="scanning-retake-button">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Retake Photo
                </Button>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleAddAnother} data-testid="scanning-add-another-button">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Another
                  </Button>
                  <Button onClick={handleDone} data-testid="scanning-done-button">
                    <Check className="mr-2 h-4 w-4" />
                    Done
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )

      case 'ERROR':
        return (
          <div className="flex h-full flex-col bg-background" data-testid="scanning-error">
            <div className="flex items-center justify-end p-4">
              <Button variant="ghost" size="icon" onClick={handleClose} aria-label="Close" data-testid="scanning-close-button">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 rounded-full bg-destructive/10 p-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
              <h3 className="text-lg font-medium">Upload Failed</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                {uploadError || 'Something went wrong while uploading your receipt.'}
              </p>
              <div className="mt-6 flex gap-3">
                <Button variant="outline" onClick={handleRetake} data-testid="scanning-retry-button">
                  <Camera className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button onClick={handleFallbackToUpload} data-testid="scanning-fallback-button">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload File Instead
                </Button>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent
        className="h-[90vh] max-h-[900px] w-full max-w-2xl overflow-hidden p-0"
        showCloseButton={false}
        data-testid="scanning-station"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Receipt Scanner</DialogTitle>
        <DialogDescription className="sr-only">
          Capture receipts using your camera or upload a file
        </DialogDescription>
        {renderContent()}
      </DialogContent>
    </Dialog>
  )
}
