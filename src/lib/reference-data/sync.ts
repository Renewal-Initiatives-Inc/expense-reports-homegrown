import { financialDb, funds, accounts } from '@/lib/db/financial-system'
import { upsertCacheEntry } from '@/lib/db/queries/reference-data'
import { eq, and } from 'drizzle-orm'

/**
 * Fetch active funds and expense accounts from financial-system DB
 * and cache them locally for dropdown rendering.
 */
export async function syncReferenceData(): Promise<{
  fundsCount: number
  accountsCount: number
}> {
  if (!financialDb) {
    throw new Error('Financial system database not configured')
  }

  // Fetch active funds
  const activeFunds = await financialDb
    .select({
      id: funds.id,
      name: funds.name,
      restrictionType: funds.restrictionType,
    })
    .from(funds)
    .where(eq(funds.isActive, true))

  // Fetch active expense accounts
  const activeAccounts = await financialDb
    .select({
      id: accounts.id,
      code: accounts.code,
      name: accounts.name,
      type: accounts.type,
    })
    .from(accounts)
    .where(and(eq(accounts.isActive, true), eq(accounts.type, 'EXPENSE')))

  // Cache both in local DB
  await upsertCacheEntry('funds', activeFunds)
  await upsertCacheEntry('accounts', activeAccounts)

  return {
    fundsCount: activeFunds.length,
    accountsCount: activeAccounts.length,
  }
}
