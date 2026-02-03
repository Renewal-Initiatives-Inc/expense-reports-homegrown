import { ReportForm } from '@/components/reports/report-form'
import { Button } from '@/components/ui/button'
import { auth } from '@/lib/auth'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function NewReportPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/reports">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to reports</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Report</h1>
          <p className="text-muted-foreground">Start a new expense report</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <ReportForm mode="create" />
      </div>
    </div>
  )
}
