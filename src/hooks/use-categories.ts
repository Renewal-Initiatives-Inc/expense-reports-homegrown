'use client'

/**
 * Hook to fetch expense categories from QBO or fallback.
 */

import useSWR from 'swr'
import type { ExpenseCategory } from '@/lib/categories'

interface CategoriesResponse {
  categories: ExpenseCategory[]
  source: 'qbo' | 'cache' | 'hardcoded' | 'loading'
  warning?: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useCategories() {
  const { data, error, isLoading } = useSWR<CategoriesResponse>('/api/qbo/categories', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute
  })

  return {
    categories: data?.categories || [],
    source: isLoading ? 'loading' : (data?.source ?? 'loading'),
    warning: data?.warning,
    isLoading,
    isError: error,
  }
}
