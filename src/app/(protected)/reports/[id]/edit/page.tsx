import { ReportForm } from '@/components/reports/report-form'
import { Button } from '@/components/ui/button'
import { auth } from '@/lib/auth'
import { getReportById } from '@/lib/db/queries/reports'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface EditReportPageProps {
  params: Promise<{ id: string }>
}

export default async function EditReportPage({ params }: EditReportPageProps) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const { id } = await params
  const report = await getReportById(id, session.user.id)

  if (!report) {
    notFound()
  }

  if (report.status !== 'open') {
    redirect(`/reports/${report.id}?error=cannot-edit`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/reports/${report.id}`}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to report</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Report</h1>
          <p className="text-muted-foreground">{report.name || 'Untitled Report'}</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <ReportForm report={report} mode="edit" />
      </div>
    </div>
  )
}
