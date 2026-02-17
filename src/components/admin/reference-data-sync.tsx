'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, Loader2, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface ReferenceDataSyncProps {
  lastSynced: string | null
}

export function ReferenceDataSync({ lastSynced }: ReferenceDataSyncProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(lastSynced)

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch('/api/reference-data/sync', { method: 'POST' })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to sync reference data')
      }
      const data = await response.json()
      setLastSync(new Date().toISOString())
      toast.success(`Synced ${data.fundsCount} funds and ${data.accountsCount} accounts`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync'
      toast.error(message)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Financial System Reference Data
        </CardTitle>
        <CardDescription>
          Sync funds and GL accounts from the financial system database. This data is used for expense categorization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {lastSync ? (
              <>Last synced: {new Date(lastSync).toLocaleString()}</>
            ) : (
              'Never synced'
            )}
          </div>
          <Button onClick={handleSync} disabled={isSyncing} variant="outline">
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Now
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
