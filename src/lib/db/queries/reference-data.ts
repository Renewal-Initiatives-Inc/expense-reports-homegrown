import { db } from '@/lib/db'
import { referenceDataCache } from '@/lib/db/schema/reference-data-cache'
import { eq } from 'drizzle-orm'

export interface CachedFund {
  id: number
  name: string
  restrictionType: string
}

export interface CachedAccount {
  id: number
  code: string
  name: string
  type: string
}

export async function getCachedFunds(): Promise<CachedFund[]> {
  const row = await db.select().from(referenceDataCache).where(eq(referenceDataCache.key, 'funds'))
  if (!row.length) return []
  return row[0].data as CachedFund[]
}

export async function getCachedAccounts(): Promise<CachedAccount[]> {
  const row = await db
    .select()
    .from(referenceDataCache)
    .where(eq(referenceDataCache.key, 'accounts'))
  if (!row.length) return []
  return row[0].data as CachedAccount[]
}

export async function upsertCacheEntry(key: string, data: unknown): Promise<void> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours

  await db
    .insert(referenceDataCache)
    .values({ key, data, fetchedAt: now, expiresAt })
    .onConflictDoUpdate({
      target: referenceDataCache.key,
      set: { data, fetchedAt: now, expiresAt },
    })
}

export async function getCacheAge(key: string): Promise<Date | null> {
  const row = await db.select().from(referenceDataCache).where(eq(referenceDataCache.key, key))
  if (!row.length) return null
  return row[0].fetchedAt
}
