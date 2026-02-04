/**
 * Card displaying QBO cache status for categories and projects.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface QboCacheStatusProps {
  cacheStatus: {
    categories: { cached: boolean; expiresAt: Date | null }
    projects: { cached: boolean; expiresAt: Date | null }
  }
}

export function QboCacheStatus({ cacheStatus }: QboCacheStatusProps) {
  const formatExpiry = (expiresAt: Date | null) => {
    if (!expiresAt) return 'Not cached'
    const date = new Date(expiresAt)
    if (date < new Date()) return 'Expired'
    return `Expires ${date.toLocaleTimeString()}`
  }

  return (
    <Card data-testid="qbo-cache-status">
      <CardHeader>
        <CardTitle>Cache Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between p-3 border rounded">
            <span>Categories</span>
            <Badge variant={cacheStatus.categories.cached ? 'default' : 'secondary'} data-testid="categories-cache-badge">
              {formatExpiry(cacheStatus.categories.expiresAt)}
            </Badge>
          </div>
          <div className="flex items-center justify-between p-3 border rounded">
            <span>Projects</span>
            <Badge variant={cacheStatus.projects.cached ? 'default' : 'secondary'} data-testid="projects-cache-badge">
              {formatExpiry(cacheStatus.projects.expiresAt)}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
