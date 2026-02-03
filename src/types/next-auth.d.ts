import { AppRole } from '@/lib/auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string
      role: AppRole
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: AppRole
    sub?: string
  }
}
