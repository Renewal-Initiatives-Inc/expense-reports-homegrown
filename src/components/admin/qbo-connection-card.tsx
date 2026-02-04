'use client'

/**
 * Card displaying QBO connection status with connect/disconnect actions.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { QboStatus } from '@/lib/qbo/types'

interface QboConnectionCardProps {
  status: QboStatus
}

export function QboConnectionCard({ status }: QboConnectionCardProps) {
  const [disconnecting, setDisconnecting] = useState(false)

  const handleConnect = () => {
    window.location.href = '/api/qbo/auth'
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect QuickBooks?')) {
      return
    }

    setDisconnecting(true)
    try {
      const response = await fetch('/api/qbo/disconnect', { method: 'POST' })
      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error('Disconnect failed:', error)
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <Card data-testid="qbo-connection-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Connection Status
          <Badge variant={status.connected ? 'default' : 'secondary'} data-testid="qbo-status-badge">
            {status.connected ? 'Connected' : 'Not Connected'}
          </Badge>
        </CardTitle>
        <CardDescription>Connect to QuickBooks Online to sync categories and projects.</CardDescription>
      </CardHeader>
      <CardContent>
        {status.connected ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>Realm ID: {status.realmId}</p>
              <p>Token expires: {status.tokenExpiresAt ? new Date(status.tokenExpiresAt).toLocaleString() : 'Unknown'}</p>
            </div>
            <Button variant="destructive" onClick={handleDisconnect} disabled={disconnecting} data-testid="qbo-disconnect-btn">
              {disconnecting ? 'Disconnecting...' : 'Disconnect QuickBooks'}
            </Button>
          </div>
        ) : (
          <Button onClick={handleConnect} data-testid="qbo-connect-btn">
            Connect to QuickBooks
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
