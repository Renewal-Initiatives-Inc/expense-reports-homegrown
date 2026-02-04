/**
 * Database operations for QBO data cache.
 * Caches categories and projects fetched from QBO API.
 */

import { and, eq, gt } from 'drizzle-orm'
import { db } from '../index'
import { qboCache } from '../schema'

const CACHE_TTL_HOURS = 1 // 1 hour cache TTL

export async function getCachedData<T>(key: string): Promise<T | null> {
  const result = await db
    .select()
    .from(qboCache)
    .where(
      and(
        eq(qboCache.key, key),
        gt(qboCache.expiresAt, new Date()) // Not expired
      )
    )
    .limit(1)

  if (result.length === 0) return null
  return result[0].data as T
}

export async function setCachedData<T extends object>(key: string, data: T): Promise<void> {
  const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000)

  await db
    .insert(qboCache)
    .values({
      key,
      data,
      fetchedAt: new Date(),
      expiresAt,
    })
    .onConflictDoUpdate({
      target: qboCache.key,
      set: {
        data,
        fetchedAt: new Date(),
        expiresAt,
      },
    })
}

export async function invalidateCache(key: string): Promise<void> {
  await db.delete(qboCache).where(eq(qboCache.key, key))
}

export async function invalidateAllCache(): Promise<void> {
  await db.delete(qboCache)
}

export async function getCacheStatus(): Promise<{
  categories: { cached: boolean; expiresAt: Date | null }
  projects: { cached: boolean; expiresAt: Date | null }
}> {
  const categories = await db.select({ expiresAt: qboCache.expiresAt }).from(qboCache).where(eq(qboCache.key, 'categories')).limit(1)

  const projects = await db.select({ expiresAt: qboCache.expiresAt }).from(qboCache).where(eq(qboCache.key, 'projects')).limit(1)

  return {
    categories: {
      cached: categories.length > 0 && categories[0].expiresAt > new Date(),
      expiresAt: categories.length > 0 ? categories[0].expiresAt : null,
    },
    projects: {
      cached: projects.length > 0 && projects[0].expiresAt > new Date(),
      expiresAt: projects.length > 0 ? projects[0].expiresAt : null,
    },
  }
}
