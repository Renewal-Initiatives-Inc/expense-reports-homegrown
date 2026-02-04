/**
 * Categories API endpoint.
 * Returns categories from QBO if connected, otherwise hardcoded fallback.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { fetchCategories } from '@/lib/qbo/service'
import { getCachedData } from '@/lib/db/queries/qbo-cache'
import { isQboConnected } from '@/lib/db/queries/qbo-tokens'
import { EXPENSE_CATEGORIES } from '@/lib/categories'
import type { QboCategory } from '@/lib/qbo/types'

export async function GET() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const connected = await isQboConnected()

  if (!connected) {
    // Return hardcoded categories when QBO not connected
    return NextResponse.json({
      categories: EXPENSE_CATEGORIES,
      source: 'hardcoded',
    })
  }

  try {
    const categories = await fetchCategories()
    return NextResponse.json({
      categories,
      source: 'qbo',
    })
  } catch {
    // Try to return cached data on error
    const cached = await getCachedData<QboCategory[]>('categories')
    if (cached) {
      return NextResponse.json({
        categories: cached,
        source: 'cache',
        warning: 'Using cached data due to QBO error',
      })
    }

    // Fall back to hardcoded categories
    return NextResponse.json({
      categories: EXPENSE_CATEGORIES,
      source: 'hardcoded',
      warning: 'QBO unavailable, using default categories',
    })
  }
}
