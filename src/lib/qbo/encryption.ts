/**
 * Token encryption/decryption utilities for secure QBO token storage.
 * Uses AES encryption to protect sensitive OAuth tokens at rest.
 */

import CryptoJS from 'crypto-js'

function getEncryptionKey(): string {
  const key = process.env.QBO_ENCRYPTION_KEY
  if (!key) {
    throw new Error('QBO_ENCRYPTION_KEY not configured')
  }
  return key
}

export function encryptToken(token: string): string {
  const key = getEncryptionKey()
  return CryptoJS.AES.encrypt(token, key).toString()
}

export function decryptToken(encryptedToken: string): string {
  const key = getEncryptionKey()
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedToken, key)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    if (!decrypted) {
      console.error('Decryption returned empty string - token may be corrupted or key mismatch')
      throw new Error('Token decryption failed')
    }
    return decrypted
  } catch (error) {
    console.error('Token decryption error:', error)
    throw new Error('Failed to decrypt token')
  }
}

export function isEncryptionConfigured(): boolean {
  return !!process.env.QBO_ENCRYPTION_KEY
}
