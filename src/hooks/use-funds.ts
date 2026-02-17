'use client'

import { useCallback, useEffect, useState } from 'react'

export interface Fund {
  id: number
  name: string
  restrictionType: string
}

export function useFunds() {
  const [funds, setFunds] = useState<Fund[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const fetchFunds = useCallback(async () => {
    try {
      const response = await fetch('/api/reference-data/funds')
      if (!response.ok) throw new Error('Failed to fetch funds')
      const data = await response.json()
      setFunds(data.funds)
      setIsError(false)
    } catch {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFunds()
  }, [fetchFunds])

  return { funds, isLoading, isError, refresh: fetchFunds }
}
