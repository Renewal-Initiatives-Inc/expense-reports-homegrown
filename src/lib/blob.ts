/**
 * Vercel Blob storage utilities for receipt image uploads.
 */

import { del, put } from '@vercel/blob'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export interface UploadResult {
  url: string
  thumbnailUrl: string
}

export class BlobUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BlobUploadError'
  }
}

/**
 * Validate that the file meets upload requirements.
 */
export function validateFile(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new BlobUploadError(`Invalid file type: ${file.type}. Allowed types: JPEG, PNG, GIF, WebP, HEIC`)
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new BlobUploadError(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size: 10MB`)
  }
}

/**
 * Upload a receipt image to Vercel Blob storage.
 */
export async function uploadReceipt(file: File): Promise<UploadResult> {
  validateFile(file)

  const timestamp = Date.now()
  const extension = file.name.split('.').pop() || 'jpg'
  const filename = `receipts/${timestamp}-${crypto.randomUUID()}.${extension}`

  const blob = await put(filename, file, {
    access: 'public',
    contentType: file.type,
  })

  // For Phase 3, thumbnail is same as original (proper thumbnails in Phase 4)
  return {
    url: blob.url,
    thumbnailUrl: blob.url,
  }
}

/**
 * Delete a receipt image from Vercel Blob storage.
 */
export async function deleteReceipt(url: string): Promise<void> {
  try {
    await del(url)
  } catch {
    // Ignore errors if file doesn't exist
    console.warn(`Failed to delete blob: ${url}`)
  }
}

/**
 * Get allowed file types for client-side validation.
 */
export function getAllowedFileTypes(): string[] {
  return ALLOWED_TYPES
}

/**
 * Get accept string for file input.
 */
export function getAcceptString(): string {
  return ALLOWED_TYPES.join(',')
}

/**
 * Get max file size in bytes.
 */
export function getMaxFileSize(): number {
  return MAX_FILE_SIZE
}
