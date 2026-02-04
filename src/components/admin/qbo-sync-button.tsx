'use client'

/**
 * Button to manually sync categories and projects from QBO.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function QboSyncButton() {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSync = async () => {
    setSyncing(true)
    setResult(null)

    try {
      const response = await fetch('/api/qbo/sync', { method: 'POST' })
      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: `Synced ${data.categories} categories and ${data.projects} projects`,
        })
      } else {
        setResult({
          success: false,
          message: data.error || 'Sync failed',
        })
      }
    } catch {
      setResult({
        success: false,
        message: 'Network error during sync',
      })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Card data-testid="qbo-sync-card">
      <CardHeader>
        <CardTitle>Manual Sync</CardTitle>
        <CardDescription>Force refresh categories and projects from QuickBooks.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button onClick={handleSync} disabled={syncing} data-testid="qbo-sync-btn">
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>

          {result && (
            <div className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`} data-testid="qbo-sync-result">
              {result.message}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
