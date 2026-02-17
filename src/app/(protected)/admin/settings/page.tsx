import { MileageRateForm } from '@/components/admin/mileage-rate-form'
import { ReferenceDataSync } from '@/components/admin/reference-data-sync'
import { getCacheAge } from '@/lib/db/queries/reference-data'
import { getMileageRate } from '@/lib/db/queries/settings'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const [mileageRate, lastSynced] = await Promise.all([
    getMileageRate(),
    getCacheAge('funds'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Settings</h1>
        <p className="text-muted-foreground">Configure system-wide settings for the expense reporting application.</p>
      </div>

      <div className="grid gap-6">
        <ReferenceDataSync lastSynced={lastSynced?.toISOString() || null} />
        <MileageRateForm currentRate={mileageRate.rate} currentEffectiveDate={mileageRate.effectiveDate} />
      </div>
    </div>
  )
}
