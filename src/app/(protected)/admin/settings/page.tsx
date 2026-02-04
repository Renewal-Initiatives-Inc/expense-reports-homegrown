import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MileageRateForm } from '@/components/admin/mileage-rate-form'
import { getMileageRate } from '@/lib/db/queries/settings'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const mileageRate = await getMileageRate()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Settings</h1>
        <p className="text-muted-foreground">Configure system-wide settings for the expense reporting application.</p>
      </div>

      <div className="grid gap-6">
        <MileageRateForm currentRate={mileageRate.rate} currentEffectiveDate={mileageRate.effectiveDate} />

        <Card data-testid="qbo-settings-card">
          <CardHeader>
            <CardTitle>QuickBooks Online</CardTitle>
            <CardDescription>Manage your QuickBooks Online integration for automatic bill synchronization.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" data-testid="qbo-settings-link">
              <Link href="/admin/qbo">
                Manage QBO Integration
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
