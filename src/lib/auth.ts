import NextAuth from 'next-auth'
import type { NextAuthConfig, Session } from 'next-auth'
import 'next-auth/jwt'

// Custom types for Zitadel roles
interface ZitadelRoles {
  [key: string]: {
    [orgId: string]: string
  }
}

// Role type for the application
export type AppRole = 'user' | 'admin'

// Extend JWT to include our custom fields
declare module 'next-auth/jwt' {
  interface JWT {
    role?: AppRole
    sub?: string
  }
}

// Extend Session to include our custom fields
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

// Extract role from Zitadel token claims
function extractRole(roles: ZitadelRoles | undefined): AppRole {
  if (!roles) return 'user'

  // Look for the expense-reports-homegrown app roles
  const appRoles = roles['app:expense-reports-homegrown']
  if (appRoles) {
    // Check if user has admin role
    if (Object.keys(appRoles).length > 0) {
      // If user has admin role in any org, they're an admin
      const hasAdmin = Object.values(appRoles).some((role) => role === 'admin')
      if (hasAdmin) return 'admin'
    }
  }

  // Also check for direct admin role
  if (roles['admin']) {
    return 'admin'
  }

  return 'user'
}

export const authConfig: NextAuthConfig = {
  providers: [
    {
      id: 'zitadel',
      name: 'Zitadel',
      type: 'oidc',
      issuer: process.env.AUTH_ZITADEL_ISSUER,
      clientId: process.env.AUTH_ZITADEL_CLIENT_ID,
      // Using PKCE instead of client secret (Zitadel recommended)
      client: {
        token_endpoint_auth_method: 'none',
      },
      checks: ['pkce', 'state'],
      authorization: {
        params: {
          scope: 'openid email profile urn:zitadel:iam:org:project:id:zitadel:aud',
        },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name || profile.preferred_username,
          email: profile.email,
          image: profile.picture,
        }
      },
    },
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Initial sign in
      if (account && profile) {
        token.sub = profile.sub as string

        // Extract roles from Zitadel token
        // Zitadel typically puts roles in 'urn:zitadel:iam:org:project:roles' claim
        const roles =
          (profile['urn:zitadel:iam:org:project:roles'] as ZitadelRoles) ||
          (profile['roles'] as ZitadelRoles)
        token.role = extractRole(roles)
      }

      return token
    },
    async session({ session, token }): Promise<Session> {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub || '',
          role: token.role || 'user',
        },
      }
    },
    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user
      const isOnLogin = request.nextUrl.pathname.startsWith('/login')
      const isOnAuthApi = request.nextUrl.pathname.startsWith('/api/auth')

      // Always allow auth API routes
      if (isOnAuthApi) {
        return true
      }

      // If on login page and logged in, redirect to home
      if (isOnLogin && isLoggedIn) {
        return Response.redirect(new URL('/', request.nextUrl))
      }

      // If on login page and not logged in, allow
      if (isOnLogin) {
        return true
      }

      // For all other routes, require authentication
      return isLoggedIn
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  trustHost: true,
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
