'use client'

/**
 * Hook to fetch expense projects from QBO or fallback.
 */

import useSWR from 'swr'
import type { ExpenseProject } from '@/lib/categories'

interface ProjectsResponse {
  projects: ExpenseProject[]
  source: 'qbo' | 'cache' | 'hardcoded' | 'loading'
  warning?: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useProjects() {
  const { data, error, isLoading } = useSWR<ProjectsResponse>('/api/qbo/projects', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute
  })

  return {
    projects: data?.projects || [],
    source: isLoading ? 'loading' : (data?.source ?? 'loading'),
    warning: data?.warning,
    isLoading,
    isError: error,
  }
}
