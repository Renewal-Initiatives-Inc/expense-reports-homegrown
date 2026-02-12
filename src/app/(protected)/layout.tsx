import { Header } from '@/components/layout/header'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'

interface ProtectedLayoutProps {
  children: ReactNode
}

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="bg-background">
      <Header user={session.user} />
      <main className="container px-4 py-6 md:px-6">{children}</main>
    </div>
  )
}
