/**
 * QBO admin page for managing QuickBooks Online integration.
 */

import { Suspense } from 'react'
import { getQboStatus } from '@/lib/qbo/service'
import { QboConnectionCard } from '@/components/admin/qbo-connection-card'
import { QboCacheStatus } from '@/components/admin/qbo-cache-status'
import { QboSyncButton } from '@/components/admin/qbo-sync-button'

interface PageProps {
  searchParams: Promise<{ success?: string; error?: string }>
}

export default async function QboAdminPage({ searchParams }: PageProps) {
  const params = await searchParams
  const status = await getQboStatus()

  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">QuickBooks Online Integration</h1>

      {params.success === 'connected' && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4" data-testid="qbo-success-message">
          Successfully connected to QuickBooks Online!
        </div>
      )}

      {params.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" data-testid="qbo-error-message">
          Error: {params.error}
        </div>
      )}

      <div className="grid gap-6">
        <Suspense fallback={<div>Loading connection status...</div>}>
          <QboConnectionCard status={status} />
        </Suspense>

        {status.connected && (
          <>
            <QboCacheStatus cacheStatus={status.cacheStatus} />
            <QboSyncButton />
          </>
        )}
      </div>
    </div>
  )
}
