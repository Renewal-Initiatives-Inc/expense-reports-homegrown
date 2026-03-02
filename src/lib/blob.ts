/**
 * Vercel Blob storage utilities for receipt image uploads.
 */

import { del, put } from '@vercel/blob'
import DOMPurify from 'isomorphic-dompurify'
import { validateMagicBytes } from './upload-validation'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic']
const EMAIL_ALLOWED_TYPES = [...ALLOWED_TYPES, 'application/pdf']
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

  // Validate magic bytes (skip HEIC — no standard magic byte check)
  if (file.type !== 'image/heic') {
    const buffer = await file.arrayBuffer()
    if (!validateMagicBytes(buffer, file.type)) {
      throw new BlobUploadError(`File content does not match declared type: ${file.type}`)
    }
  }

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
 * Upload an email attachment (image or PDF) to Vercel Blob storage.
 * Accepts ArrayBuffer from postal-mime attachment parsing.
 */
export async function uploadEmailAttachment(
  content: ArrayBuffer,
  filename: string,
  mimeType: string
): Promise<UploadResult> {
  if (!EMAIL_ALLOWED_TYPES.includes(mimeType)) {
    throw new BlobUploadError(`Invalid file type: ${mimeType}`)
  }

  if (content.byteLength > MAX_FILE_SIZE) {
    throw new BlobUploadError(`File too large: ${(content.byteLength / 1024 / 1024).toFixed(2)}MB. Maximum size: 10MB`)
  }

  // Validate magic bytes (skip HEIC — no standard magic byte check)
  if (mimeType !== 'image/heic') {
    if (!validateMagicBytes(content, mimeType)) {
      throw new BlobUploadError(`File content does not match declared type: ${mimeType}`)
    }
  }

  const timestamp = Date.now()
  const extension = filename.split('.').pop() || 'bin'
  const blobPath = `receipts/email/${timestamp}-${crypto.randomUUID()}.${extension}`

  const blob = await put(blobPath, Buffer.from(content), {
    access: 'public',
    contentType: mimeType,
  })

  return {
    url: blob.url,
    thumbnailUrl: blob.url,
  }
}

/**
 * Upload an HTML email body as a viewable receipt.
 * Sanitizes HTML to remove scripts, event handlers, and other XSS vectors.
 */
export async function uploadEmailHtml(html: string): Promise<UploadResult> {
  const sanitizedHtml = DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    ADD_TAGS: ['style'],
  })

  const timestamp = Date.now()
  const blobPath = `receipts/email/${timestamp}-${crypto.randomUUID()}.html`

  const blob = await put(blobPath, sanitizedHtml, {
    access: 'public',
    contentType: 'text/html',
  })

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
