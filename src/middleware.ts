import { auth } from '@/lib/auth'

export default auth

export const config = {
  matcher: ['/((?!api/auth|api/email/inbound|_next/static|_next/image|favicon.ico).*)'],
}
