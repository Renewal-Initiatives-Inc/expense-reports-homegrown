'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText } from 'lucide-react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginContent() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const error = searchParams.get('error')

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <FileText className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Expense Reports</CardTitle>
          <CardDescription>Renewal Initiatives</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              data-testid="login-error"
            >
              {error === 'OAuthAccountNotLinked'
                ? 'This account is already associated with another sign-in method.'
                : 'An error occurred during sign in. Please try again.'}
            </div>
          )}
          <Button
            className="w-full"
            size="lg"
            onClick={() => signIn('zitadel', { callbackUrl })}
            data-testid="login-button"
          >
            Sign in with Zitadel
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            You will be redirected to Zitadel to complete authentication.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
