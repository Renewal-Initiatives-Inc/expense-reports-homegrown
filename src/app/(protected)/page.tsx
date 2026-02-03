import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RoleBadge } from '@/components/ui/role-badge'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.user.name || session.user.email}
        </p>
      </div>

      <Card data-testid="welcome-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Welcome to Expense Reports
            <RoleBadge role={session.user.role} />
          </CardTitle>
          <CardDescription>
            {session.user.role === 'admin'
              ? 'You have administrator access. You can approve or reject expense reports.'
              : 'Submit your expense reports for reimbursement.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="font-medium text-muted-foreground">Name:</span>
              <span data-testid="user-name">{session.user.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="font-medium text-muted-foreground">Email:</span>
              <span data-testid="user-email">{session.user.email}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="font-medium text-muted-foreground">Role:</span>
              <span data-testid="user-role">{session.user.role}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>
            This is a placeholder dashboard. Features will be added in future phases.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Upcoming features:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Create and manage expense reports</li>
            <li>Capture receipts with camera</li>
            <li>Track mileage for reimbursement</li>
            <li>Submit reports for approval</li>
            {session.user.role === 'admin' && (
              <>
                <li>Review and approve submitted reports</li>
                <li>Sync approved reports to QuickBooks</li>
              </>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
