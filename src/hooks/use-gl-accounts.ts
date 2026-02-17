'use client'

import { useCallback, useEffect, useState } from 'react'

export interface GLAccount {
  id: number
  code: string
  name: string
  type: string
}

export function useGLAccounts() {
  const [accounts, setAccounts] = useState<GLAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/reference-data/accounts')
      if (!response.ok) throw new Error('Failed to fetch GL accounts')
      const data = await response.json()
      setAccounts(data.accounts)
      setIsError(false)
    } catch {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  return { accounts, isLoading, isError, refresh: fetchAccounts }
}
