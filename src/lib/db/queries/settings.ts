import { eq } from 'drizzle-orm'
import { db } from '..'
import { settings, type MileageRateSetting } from '../schema'

const DEFAULT_MILEAGE_RATE: MileageRateSetting = {
  rate: 0.70, // 2025 IRS standard mileage rate
  effectiveDate: '2025-01-01',
}

export async function getSetting<T>(key: string): Promise<T | null> {
  const results = await db.select().from(settings).where(eq(settings.key, key)).limit(1)

  if (results.length === 0) {
    return null
  }

  return results[0].value as T
}

export async function setSetting<T>(key: string, value: T, userId: string): Promise<void> {
  await db
    .insert(settings)
    .values({
      key,
      value: value as unknown as Record<string, unknown>,
      updatedAt: new Date(),
      updatedBy: userId,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: value as unknown as Record<string, unknown>,
        updatedAt: new Date(),
        updatedBy: userId,
      },
    })
}

export async function getMileageRate(): Promise<MileageRateSetting> {
  const rate = await getSetting<MileageRateSetting>('mileage_rate')

  if (!rate) {
    return DEFAULT_MILEAGE_RATE
  }

  return rate
}

export async function setMileageRate(rate: number, effectiveDate: string, userId: string): Promise<void> {
  await setSetting<MileageRateSetting>(
    'mileage_rate',
    {
      rate,
      effectiveDate,
    },
    userId
  )
}
