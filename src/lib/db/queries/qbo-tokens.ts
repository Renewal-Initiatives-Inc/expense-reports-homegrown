/**
 * Database operations for QBO OAuth tokens.
 * Tokens are stored encrypted for security.
 */

import { eq } from 'drizzle-orm'
import { db } from '../index'
import { qboTokens } from '../schema'
import { decryptToken, encryptToken } from '@/lib/qbo/encryption'

export interface StoredQboTokens {
  accessToken: string
  refreshToken: string
  realmId: string
  expiresAt: Date
  updatedBy: string | null
}

export async function getQboTokens(): Promise<StoredQboTokens | null> {
  const result = await db.select().from(qboTokens).where(eq(qboTokens.id, 1)).limit(1)

  if (result.length === 0) return null

  const tokens = result[0]
  return {
    accessToken: decryptToken(tokens.accessToken),
    refreshToken: decryptToken(tokens.refreshToken),
    realmId: tokens.realmId,
    expiresAt: tokens.expiresAt,
    updatedBy: tokens.updatedBy,
  }
}

export async function saveQboTokens(
  tokens: {
    accessToken: string
    refreshToken: string
    realmId: string
    expiresAt: Date
  },
  updatedBy: string
): Promise<void> {
  const encrypted = {
    accessToken: encryptToken(tokens.accessToken),
    refreshToken: encryptToken(tokens.refreshToken),
    realmId: tokens.realmId,
    expiresAt: tokens.expiresAt,
    updatedBy,
    updatedAt: new Date(),
  }

  // Upsert: insert or update the single row
  await db
    .insert(qboTokens)
    .values({ id: 1, ...encrypted })
    .onConflictDoUpdate({
      target: qboTokens.id,
      set: encrypted,
    })
}

export async function deleteQboTokens(): Promise<void> {
  await db.delete(qboTokens).where(eq(qboTokens.id, 1))
}

export async function isQboConnected(): Promise<boolean> {
  try {
    const tokens = await getQboTokens()
    return tokens !== null
  } catch {
    return false
  }
}

export async function isTokenExpiringSoon(): Promise<boolean> {
  const tokens = await getQboTokens()
  if (!tokens) return false

  // Consider expired if within 5 minutes of expiry
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)
  return tokens.expiresAt < fiveMinutesFromNow
}
