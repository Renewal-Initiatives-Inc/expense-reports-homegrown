'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { X } from 'lucide-react'
import Image from 'next/image'

interface ReceiptViewerProps {
  url: string | null
  open: boolean
  onClose: () => void
}

export function ReceiptViewer({ url, open, onClose }: ReceiptViewerProps) {
  if (!url) return null

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-auto p-0" data-testid="receipt-viewer">
        <DialogTitle className="sr-only">Receipt Image</DialogTitle>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
          data-testid="close-receipt-viewer"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>
        <div className="relative aspect-auto min-h-[300px] w-full">
          <Image src={url} alt="Receipt" fill className="object-contain" sizes="(max-width: 768px) 100vw, 768px" priority />
        </div>
      </DialogContent>
    </Dialog>
  )
}
