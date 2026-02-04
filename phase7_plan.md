# Phase 7: QuickBooks Online Integration - Setup

> **Goal**: Establish QBO OAuth connection and sync reference data.
>
> **Deliverable**: App connected to QBO; categories and projects sync automatically.

---

## Prerequisites Verification

Before starting Phase 7, verify these Phase 2 deliverables are working:

- [ ] Database schema includes `qbo_tokens` table
- [ ] Database schema includes `qbo_cache` table
- [ ] `qboBillId` field exists on `expense_reports` table
- [ ] Admin role detection working via Zitadel session
- [ ] Settings table exists for configuration storage

If Phase 3 is complete, also verify:

- [ ] Hardcoded categories exist in `src/lib/categories.ts`
- [ ] Hardcoded projects exist in `src/lib/categories.ts`
- [ ] Expense form uses these hardcoded values

---

## External Setup Required (Before Implementation)

### QBO Developer Account Setup

1. **Register at Intuit Developer Portal**: https://developer.intuit.com/
2. **Create a new app** in the Intuit Developer dashboard:
   - App Name: `Expense Reports Homegrown`
   - Select QuickBooks Online Accounting scope
   - Production or Development environment (start with Sandbox)
3. **Configure OAuth settings**:
   - Redirect URI (Development): `http://localhost:3000/api/qbo/callback`
   - Redirect URI (Production): `https://[your-domain]/api/qbo/callback`
4. **Note down credentials**:
   - Client ID
   - Client Secret
   - OAuth Scopes: `com.intuit.quickbooks.accounting` (read/write accounts, classes, bills)

### Required QBO API Scopes

| Scope | Purpose |
|-------|---------|
| `com.intuit.quickbooks.accounting` | Read chart of accounts, classes, create bills |

---

## Task Breakdown

### Task 1: Add Environment Variables and Dependencies

**Files to modify:**
- `package.json` - Add QBO SDK/utilities
- `.env.example` - Add QBO configuration placeholders
- `.env.local` - Add actual QBO credentials (do not commit)

**Implementation:**

```bash
# Add dependencies
npm install intuit-oauth crypto-js
npm install -D @types/crypto-js
```

**Environment variables:**
```bash
# .env.example additions
# QuickBooks Online API
QBO_CLIENT_ID=
QBO_CLIENT_SECRET=
QBO_REDIRECT_URI=http://localhost:3000/api/qbo/callback
QBO_ENVIRONMENT=sandbox  # 'sandbox' or 'production'

# Encryption key for tokens (generate with: openssl rand -base64 32)
QBO_ENCRYPTION_KEY=
```

**Acceptance Criteria:**
- [ ] QBO SDK installed
- [ ] Environment variables documented
- [ ] Encryption key generated for token storage

---

### Task 2: Create QBO Client Utility Module

**Files to create:**
- `src/lib/qbo/client.ts` - QBO API client wrapper
- `src/lib/qbo/types.ts` - QBO-specific type definitions
- `src/lib/qbo/encryption.ts` - Token encryption/decryption utilities

**Implementation:**

```typescript
// src/lib/qbo/types.ts
export interface QboTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number  // seconds
  x_refresh_token_expires_in: number
  realmId: string
}

export interface QboAccount {
  Id: string
  Name: string
  AccountType: string
  AccountSubType: string
  Active: boolean
  FullyQualifiedName: string
}

export interface QboClass {
  Id: string
  Name: string
  Active: boolean
  FullyQualifiedName: string
}

export interface QboCategory {
  id: string
  name: string
  type: string
  subType: string
  fullyQualifiedName: string
}

export interface QboProject {
  id: string
  name: string
  fullyQualifiedName: string
}
```

```typescript
// src/lib/qbo/encryption.ts
import CryptoJS from 'crypto-js'

const ENCRYPTION_KEY = process.env.QBO_ENCRYPTION_KEY || ''

export function encryptToken(token: string): string {
  if (!ENCRYPTION_KEY) throw new Error('QBO_ENCRYPTION_KEY not configured')
  return CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString()
}

export function decryptToken(encryptedToken: string): string {
  if (!ENCRYPTION_KEY) throw new Error('QBO_ENCRYPTION_KEY not configured')
  const bytes = CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY)
  return bytes.toString(CryptoJS.enc.Utf8)
}
```

```typescript
// src/lib/qbo/client.ts
import OAuthClient from 'intuit-oauth'
import { decryptToken, encryptToken } from './encryption'
import type { QboAccount, QboClass, QboTokenResponse } from './types'

export function createOAuthClient(): OAuthClient {
  return new OAuthClient({
    clientId: process.env.QBO_CLIENT_ID!,
    clientSecret: process.env.QBO_CLIENT_SECRET!,
    environment: process.env.QBO_ENVIRONMENT || 'sandbox',
    redirectUri: process.env.QBO_REDIRECT_URI!,
  })
}

export function getAuthorizationUrl(oauthClient: OAuthClient, state: string): string {
  return oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting],
    state,
  })
}

export async function exchangeCodeForTokens(
  oauthClient: OAuthClient,
  url: string
): Promise<QboTokenResponse> {
  const authResponse = await oauthClient.createToken(url)
  return authResponse.getJson() as QboTokenResponse
}

export async function refreshTokens(
  oauthClient: OAuthClient,
  refreshToken: string
): Promise<QboTokenResponse> {
  oauthClient.setToken({ refresh_token: refreshToken })
  const authResponse = await oauthClient.refresh()
  return authResponse.getJson() as QboTokenResponse
}

export async function makeApiCall<T>(
  oauthClient: OAuthClient,
  endpoint: string
): Promise<T> {
  const response = await oauthClient.makeApiCall({ url: endpoint })
  return response.getJson() as T
}
```

**Acceptance Criteria:**
- [ ] OAuth client creates authorization URL
- [ ] Token exchange works with authorization code
- [ ] Token refresh works with refresh token
- [ ] Encryption/decryption roundtrip works correctly
- [ ] API calls can be made with valid tokens

---

### Task 3: Create QBO Token Database Operations

**Files to create:**
- `src/lib/db/queries/qbo-tokens.ts` - Token CRUD operations

**Implementation:**

```typescript
// src/lib/db/queries/qbo-tokens.ts
import { eq } from 'drizzle-orm'
import { db } from '../index'
import { qboTokens } from '../schema'
import { encryptToken, decryptToken } from '@/lib/qbo/encryption'

export interface StoredQboTokens {
  accessToken: string
  refreshToken: string
  realmId: string
  expiresAt: Date
  updatedBy: string | null
}

export async function getQboTokens(): Promise<StoredQboTokens | null> {
  const result = await db
    .select()
    .from(qboTokens)
    .where(eq(qboTokens.id, 1))
    .limit(1)

  if (result.length === 0) return null

  const tokens = result[0]
  return {
    accessToken: decryptToken(tokens.accessToken),
    refreshToken: decryptToken(tokens.refreshToken),
    realmId: tokens.realmId,
    expiresAt: tokens.expiresAt,
    updatedBy: tokens.updatedBy,
  }
}

export async function saveQboTokens(
  tokens: {
    accessToken: string
    refreshToken: string
    realmId: string
    expiresAt: Date
  },
  updatedBy: string
): Promise<void> {
  const encrypted = {
    accessToken: encryptToken(tokens.accessToken),
    refreshToken: encryptToken(tokens.refreshToken),
    realmId: tokens.realmId,
    expiresAt: tokens.expiresAt,
    updatedBy,
    updatedAt: new Date(),
  }

  // Upsert: insert or update the single row
  await db
    .insert(qboTokens)
    .values({ id: 1, ...encrypted })
    .onConflictDoUpdate({
      target: qboTokens.id,
      set: encrypted,
    })
}

export async function deleteQboTokens(): Promise<void> {
  await db.delete(qboTokens).where(eq(qboTokens.id, 1))
}

export async function isQboConnected(): Promise<boolean> {
  const tokens = await getQboTokens()
  return tokens !== null
}

export async function isTokenExpiringSoon(): Promise<boolean> {
  const tokens = await getQboTokens()
  if (!tokens) return false

  // Consider expired if within 5 minutes of expiry
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)
  return tokens.expiresAt < fiveMinutesFromNow
}
```

**Acceptance Criteria:**
- [ ] Tokens saved with encryption
- [ ] Tokens retrieved with decryption
- [ ] Connection status check works
- [ ] Expiry detection works

---

### Task 4: Create QBO Cache Database Operations

**Files to create:**
- `src/lib/db/queries/qbo-cache.ts` - Cache CRUD operations

**Implementation:**

```typescript
// src/lib/db/queries/qbo-cache.ts
import { eq, and, gt } from 'drizzle-orm'
import { db } from '../index'
import { qboCache } from '../schema'

const CACHE_TTL_HOURS = 1  // 1 hour cache TTL

export async function getCachedData<T>(key: string): Promise<T | null> {
  const result = await db
    .select()
    .from(qboCache)
    .where(
      and(
        eq(qboCache.key, key),
        gt(qboCache.expiresAt, new Date())  // Not expired
      )
    )
    .limit(1)

  if (result.length === 0) return null
  return result[0].data as T
}

export async function setCachedData<T>(key: string, data: T): Promise<void> {
  const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000)

  await db
    .insert(qboCache)
    .values({
      key,
      data: data as object,
      fetchedAt: new Date(),
      expiresAt,
    })
    .onConflictDoUpdate({
      target: qboCache.key,
      set: {
        data: data as object,
        fetchedAt: new Date(),
        expiresAt,
      },
    })
}

export async function invalidateCache(key: string): Promise<void> {
  await db.delete(qboCache).where(eq(qboCache.key, key))
}

export async function invalidateAllCache(): Promise<void> {
  await db.delete(qboCache)
}

export async function getCacheStatus(): Promise<{
  categories: { cached: boolean; expiresAt: Date | null }
  projects: { cached: boolean; expiresAt: Date | null }
}> {
  const categories = await db
    .select({ expiresAt: qboCache.expiresAt })
    .from(qboCache)
    .where(eq(qboCache.key, 'categories'))
    .limit(1)

  const projects = await db
    .select({ expiresAt: qboCache.expiresAt })
    .from(qboCache)
    .where(eq(qboCache.key, 'projects'))
    .limit(1)

  return {
    categories: {
      cached: categories.length > 0 && categories[0].expiresAt > new Date(),
      expiresAt: categories.length > 0 ? categories[0].expiresAt : null,
    },
    projects: {
      cached: projects.length > 0 && projects[0].expiresAt > new Date(),
      expiresAt: projects.length > 0 ? projects[0].expiresAt : null,
    },
  }
}
```

**Acceptance Criteria:**
- [ ] Cache stores and retrieves data correctly
- [ ] Expired cache returns null
- [ ] Cache TTL is 1 hour as specified
- [ ] Cache status endpoint works

---

### Task 5: Create QBO Service Layer

**Files to create:**
- `src/lib/qbo/service.ts` - High-level QBO operations with token management

**Implementation:**

```typescript
// src/lib/qbo/service.ts
import { createOAuthClient, refreshTokens, makeApiCall } from './client'
import { getQboTokens, saveQboTokens, isTokenExpiringSoon } from '@/lib/db/queries/qbo-tokens'
import { getCachedData, setCachedData } from '@/lib/db/queries/qbo-cache'
import type { QboAccount, QboClass, QboCategory, QboProject } from './types'

const QBO_BASE_URL_SANDBOX = 'https://sandbox-quickbooks.api.intuit.com'
const QBO_BASE_URL_PRODUCTION = 'https://quickbooks.api.intuit.com'

function getBaseUrl(): string {
  return process.env.QBO_ENVIRONMENT === 'production'
    ? QBO_BASE_URL_PRODUCTION
    : QBO_BASE_URL_SANDBOX
}

async function getValidOAuthClient(): Promise<{
  client: ReturnType<typeof createOAuthClient>
  realmId: string
} | null> {
  const tokens = await getQboTokens()
  if (!tokens) return null

  const client = createOAuthClient()

  // Check if token needs refresh
  if (await isTokenExpiringSoon()) {
    try {
      const newTokens = await refreshTokens(client, tokens.refreshToken)
      await saveQboTokens({
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token,
        realmId: tokens.realmId,
        expiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
      }, 'system')

      client.setToken({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        realmId: tokens.realmId,
      })
    } catch (error) {
      console.error('Failed to refresh QBO token:', error)
      return null
    }
  } else {
    client.setToken({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      realmId: tokens.realmId,
    })
  }

  return { client, realmId: tokens.realmId }
}

export async function fetchCategories(): Promise<QboCategory[]> {
  // Check cache first
  const cached = await getCachedData<QboCategory[]>('categories')
  if (cached) return cached

  // Fetch from QBO
  const auth = await getValidOAuthClient()
  if (!auth) {
    throw new Error('QuickBooks is not connected')
  }

  const baseUrl = getBaseUrl()
  const endpoint = `${baseUrl}/v3/company/${auth.realmId}/query?query=SELECT * FROM Account WHERE AccountType = 'Expense' AND Active = true&minorversion=65`

  try {
    const response = await makeApiCall<{
      QueryResponse: { Account: QboAccount[] }
    }>(auth.client, endpoint)

    const categories: QboCategory[] = (response.QueryResponse.Account || []).map(account => ({
      id: account.Id,
      name: account.Name,
      type: account.AccountType,
      subType: account.AccountSubType,
      fullyQualifiedName: account.FullyQualifiedName,
    }))

    // Cache the result
    await setCachedData('categories', categories)

    return categories
  } catch (error) {
    console.error('Failed to fetch categories from QBO:', error)
    throw new Error('Failed to fetch categories from QuickBooks')
  }
}

export async function fetchProjects(): Promise<QboProject[]> {
  // Check cache first
  const cached = await getCachedData<QboProject[]>('projects')
  if (cached) return cached

  // Fetch from QBO (Classes in QBO = Projects)
  const auth = await getValidOAuthClient()
  if (!auth) {
    throw new Error('QuickBooks is not connected')
  }

  const baseUrl = getBaseUrl()
  const endpoint = `${baseUrl}/v3/company/${auth.realmId}/query?query=SELECT * FROM Class WHERE Active = true&minorversion=65`

  try {
    const response = await makeApiCall<{
      QueryResponse: { Class?: QboClass[] }
    }>(auth.client, endpoint)

    const projects: QboProject[] = (response.QueryResponse.Class || []).map(cls => ({
      id: cls.Id,
      name: cls.Name,
      fullyQualifiedName: cls.FullyQualifiedName,
    }))

    // Cache the result
    await setCachedData('projects', projects)

    return projects
  } catch (error) {
    console.error('Failed to fetch projects from QBO:', error)
    throw new Error('Failed to fetch projects from QuickBooks')
  }
}

export async function getQboStatus(): Promise<{
  connected: boolean
  realmId: string | null
  tokenExpiresAt: Date | null
  cacheStatus: {
    categories: { cached: boolean; expiresAt: Date | null }
    projects: { cached: boolean; expiresAt: Date | null }
  }
}> {
  const tokens = await getQboTokens()
  const { getCacheStatus } = await import('@/lib/db/queries/qbo-cache')
  const cacheStatus = await getCacheStatus()

  return {
    connected: tokens !== null,
    realmId: tokens?.realmId || null,
    tokenExpiresAt: tokens?.expiresAt || null,
    cacheStatus,
  }
}
```

**Acceptance Criteria:**
- [ ] Categories fetched from QBO API
- [ ] Projects (Classes) fetched from QBO API
- [ ] Automatic token refresh before expiry
- [ ] Cache is checked before API call
- [ ] Cache is populated after API call
- [ ] Errors handled gracefully

---

### Task 6: Create OAuth Flow API Routes

**Files to create:**
- `src/app/api/qbo/auth/route.ts` - Initiate OAuth flow
- `src/app/api/qbo/callback/route.ts` - Handle OAuth callback
- `src/app/api/qbo/disconnect/route.ts` - Disconnect QBO

**Implementation:**

```typescript
// src/app/api/qbo/auth/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createOAuthClient, getAuthorizationUrl } from '@/lib/qbo/client'
import { randomBytes } from 'crypto'

export async function GET() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins can connect QBO
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const oauthClient = createOAuthClient()
  const state = randomBytes(16).toString('hex')

  // Store state in session/cookie for CSRF protection
  const authUrl = getAuthorizationUrl(oauthClient, state)

  const response = NextResponse.redirect(authUrl)
  response.cookies.set('qbo_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
  })

  return response
}
```

```typescript
// src/app/api/qbo/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createOAuthClient, exchangeCodeForTokens } from '@/lib/qbo/client'
import { saveQboTokens } from '@/lib/db/queries/qbo-tokens'

export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const searchParams = request.nextUrl.searchParams
  const state = searchParams.get('state')
  const storedState = request.cookies.get('qbo_oauth_state')?.value

  // Validate state for CSRF protection
  if (!state || state !== storedState) {
    return NextResponse.redirect(
      new URL('/admin/qbo?error=invalid_state', request.url)
    )
  }

  // Check for OAuth errors
  const error = searchParams.get('error')
  if (error) {
    return NextResponse.redirect(
      new URL(`/admin/qbo?error=${encodeURIComponent(error)}`, request.url)
    )
  }

  try {
    const oauthClient = createOAuthClient()
    const tokens = await exchangeCodeForTokens(oauthClient, request.url)

    await saveQboTokens({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      realmId: tokens.realmId,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    }, session.user.id)

    // Clear the state cookie
    const response = NextResponse.redirect(
      new URL('/admin/qbo?success=connected', request.url)
    )
    response.cookies.delete('qbo_oauth_state')

    return response
  } catch (err) {
    console.error('QBO OAuth callback error:', err)
    return NextResponse.redirect(
      new URL('/admin/qbo?error=token_exchange_failed', request.url)
    )
  }
}
```

```typescript
// src/app/api/qbo/disconnect/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { deleteQboTokens } from '@/lib/db/queries/qbo-tokens'
import { invalidateAllCache } from '@/lib/db/queries/qbo-cache'

export async function POST() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    await deleteQboTokens()
    await invalidateAllCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to disconnect QBO:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    )
  }
}
```

**Acceptance Criteria:**
- [ ] OAuth flow initiates correctly
- [ ] Callback handles tokens and stores them
- [ ] CSRF state validation works
- [ ] Only admins can access these endpoints
- [ ] Disconnect clears tokens and cache

---

### Task 7: Create Category and Project API Routes

**Files to create:**
- `src/app/api/qbo/categories/route.ts` - Get categories
- `src/app/api/qbo/projects/route.ts` - Get projects
- `src/app/api/qbo/sync/route.ts` - Force sync refresh
- `src/app/api/qbo/status/route.ts` - Connection status

**Implementation:**

```typescript
// src/app/api/qbo/categories/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { fetchCategories } from '@/lib/qbo/service'
import { getCachedData } from '@/lib/db/queries/qbo-cache'
import { isQboConnected } from '@/lib/db/queries/qbo-tokens'
import { EXPENSE_CATEGORIES } from '@/lib/categories'

export async function GET() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const connected = await isQboConnected()

  if (!connected) {
    // Return hardcoded categories when QBO not connected
    return NextResponse.json({
      categories: EXPENSE_CATEGORIES,
      source: 'hardcoded',
    })
  }

  try {
    const categories = await fetchCategories()
    return NextResponse.json({
      categories,
      source: 'qbo',
    })
  } catch (error) {
    // Try to return cached data on error
    const cached = await getCachedData('categories')
    if (cached) {
      return NextResponse.json({
        categories: cached,
        source: 'cache',
        warning: 'Using cached data due to QBO error',
      })
    }

    // Fall back to hardcoded categories
    return NextResponse.json({
      categories: EXPENSE_CATEGORIES,
      source: 'hardcoded',
      warning: 'QBO unavailable, using default categories',
    })
  }
}
```

```typescript
// src/app/api/qbo/projects/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { fetchProjects } from '@/lib/qbo/service'
import { getCachedData } from '@/lib/db/queries/qbo-cache'
import { isQboConnected } from '@/lib/db/queries/qbo-tokens'
import { EXPENSE_PROJECTS } from '@/lib/categories'

export async function GET() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const connected = await isQboConnected()

  if (!connected) {
    return NextResponse.json({
      projects: EXPENSE_PROJECTS,
      source: 'hardcoded',
    })
  }

  try {
    const projects = await fetchProjects()
    return NextResponse.json({
      projects,
      source: 'qbo',
    })
  } catch (error) {
    const cached = await getCachedData('projects')
    if (cached) {
      return NextResponse.json({
        projects: cached,
        source: 'cache',
        warning: 'Using cached data due to QBO error',
      })
    }

    return NextResponse.json({
      projects: EXPENSE_PROJECTS,
      source: 'hardcoded',
      warning: 'QBO unavailable, using default projects',
    })
  }
}
```

```typescript
// src/app/api/qbo/sync/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { fetchCategories, fetchProjects } from '@/lib/qbo/service'
import { invalidateAllCache } from '@/lib/db/queries/qbo-cache'
import { isQboConnected } from '@/lib/db/queries/qbo-tokens'

export async function POST() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const connected = await isQboConnected()
  if (!connected) {
    return NextResponse.json(
      { error: 'QuickBooks not connected' },
      { status: 400 }
    )
  }

  try {
    // Invalidate cache first
    await invalidateAllCache()

    // Fetch fresh data (will populate cache)
    const [categories, projects] = await Promise.all([
      fetchCategories(),
      fetchProjects(),
    ])

    return NextResponse.json({
      success: true,
      categories: categories.length,
      projects: projects.length,
    })
  } catch (error) {
    console.error('QBO sync failed:', error)
    return NextResponse.json(
      { error: 'Sync failed. Please check QBO connection.' },
      { status: 500 }
    )
  }
}
```

```typescript
// src/app/api/qbo/status/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getQboStatus } from '@/lib/qbo/service'

export async function GET() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const status = await getQboStatus()

  return NextResponse.json(status)
}
```

**Acceptance Criteria:**
- [ ] Categories endpoint returns QBO data when connected
- [ ] Categories endpoint falls back gracefully when disconnected
- [ ] Projects endpoint behaves similarly
- [ ] Sync endpoint refreshes cache from QBO
- [ ] Status endpoint returns connection info

---

### Task 8: Create Admin Layout and QBO Page

**Files to create:**
- `src/app/(protected)/admin/layout.tsx` - Admin layout with role check
- `src/app/(protected)/admin/qbo/page.tsx` - QBO connection management page

**Implementation:**

```typescript
// src/app/(protected)/admin/layout.tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.role !== 'admin') {
    redirect('/')
  }

  return <>{children}</>
}
```

```typescript
// src/app/(protected)/admin/qbo/page.tsx
import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { getQboStatus } from '@/lib/qbo/service'
import { QboConnectionCard } from '@/components/admin/qbo-connection-card'
import { QboCacheStatus } from '@/components/admin/qbo-cache-status'
import { QboSyncButton } from '@/components/admin/qbo-sync-button'

export default async function QboAdminPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string }
}) {
  const session = await auth()
  const status = await getQboStatus()

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">QuickBooks Online Integration</h1>

      {searchParams.success === 'connected' && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Successfully connected to QuickBooks Online!
        </div>
      )}

      {searchParams.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {searchParams.error}
        </div>
      )}

      <div className="grid gap-6">
        <Suspense fallback={<div>Loading connection status...</div>}>
          <QboConnectionCard status={status} />
        </Suspense>

        {status.connected && (
          <>
            <QboCacheStatus cacheStatus={status.cacheStatus} />
            <QboSyncButton />
          </>
        )}
      </div>
    </div>
  )
}
```

**Acceptance Criteria:**
- [ ] Admin layout restricts to admin role
- [ ] QBO page shows connection status
- [ ] Connect/Disconnect buttons work
- [ ] Cache status displayed
- [ ] Success/error messages displayed

---

### Task 9: Create Admin QBO Components

**Files to create:**
- `src/components/admin/qbo-connection-card.tsx` - Connection status and actions
- `src/components/admin/qbo-cache-status.tsx` - Cache status display
- `src/components/admin/qbo-sync-button.tsx` - Manual sync trigger

**Implementation:**

```typescript
// src/components/admin/qbo-connection-card.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface QboConnectionCardProps {
  status: {
    connected: boolean
    realmId: string | null
    tokenExpiresAt: Date | null
  }
}

export function QboConnectionCard({ status }: QboConnectionCardProps) {
  const [disconnecting, setDisconnecting] = useState(false)

  const handleConnect = () => {
    window.location.href = '/api/qbo/auth'
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect QuickBooks?')) {
      return
    }

    setDisconnecting(true)
    try {
      const response = await fetch('/api/qbo/disconnect', { method: 'POST' })
      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error('Disconnect failed:', error)
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Connection Status
          <Badge variant={status.connected ? 'default' : 'secondary'}>
            {status.connected ? 'Connected' : 'Not Connected'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Connect to QuickBooks Online to sync categories and projects.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status.connected ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>Realm ID: {status.realmId}</p>
              <p>Token expires: {new Date(status.tokenExpiresAt!).toLocaleString()}</p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? 'Disconnecting...' : 'Disconnect QuickBooks'}
            </Button>
          </div>
        ) : (
          <Button onClick={handleConnect}>
            Connect to QuickBooks
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

```typescript
// src/components/admin/qbo-cache-status.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface QboCacheStatusProps {
  cacheStatus: {
    categories: { cached: boolean; expiresAt: Date | null }
    projects: { cached: boolean; expiresAt: Date | null }
  }
}

export function QboCacheStatus({ cacheStatus }: QboCacheStatusProps) {
  const formatExpiry = (expiresAt: Date | null) => {
    if (!expiresAt) return 'Not cached'
    const date = new Date(expiresAt)
    if (date < new Date()) return 'Expired'
    return `Expires ${date.toLocaleTimeString()}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cache Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between p-3 border rounded">
            <span>Categories</span>
            <Badge variant={cacheStatus.categories.cached ? 'default' : 'secondary'}>
              {formatExpiry(cacheStatus.categories.expiresAt)}
            </Badge>
          </div>
          <div className="flex items-center justify-between p-3 border rounded">
            <span>Projects</span>
            <Badge variant={cacheStatus.projects.cached ? 'default' : 'secondary'}>
              {formatExpiry(cacheStatus.projects.expiresAt)}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

```typescript
// src/components/admin/qbo-sync-button.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export function QboSyncButton() {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSync = async () => {
    setSyncing(true)
    setResult(null)

    try {
      const response = await fetch('/api/qbo/sync', { method: 'POST' })
      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: `Synced ${data.categories} categories and ${data.projects} projects`,
        })
      } else {
        setResult({
          success: false,
          message: data.error || 'Sync failed',
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error during sync',
      })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Sync</CardTitle>
        <CardDescription>
          Force refresh categories and projects from QuickBooks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button onClick={handleSync} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>

          {result && (
            <div className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
              {result.message}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

**Acceptance Criteria:**
- [ ] Connection card shows status and actions
- [ ] Cache status shows expiry times
- [ ] Sync button triggers refresh and shows result
- [ ] Components are accessible

---

### Task 10: Update Navigation with Admin Link

**Files to modify:**
- `src/components/layout/nav.tsx` - Add admin link for admin users

**Implementation:**

Add admin navigation item:

```typescript
// In nav.tsx, add to navigation items (conditionally for admins):
{session?.user.role === 'admin' && (
  <Link
    href="/admin/qbo"
    className={cn(
      'text-sm font-medium transition-colors hover:text-primary',
      pathname.startsWith('/admin')
        ? 'text-foreground'
        : 'text-muted-foreground'
    )}
  >
    Admin
  </Link>
)}
```

**Acceptance Criteria:**
- [ ] Admin link visible only to admin users
- [ ] Link navigates to admin QBO page
- [ ] Active state styling works

---

### Task 11: Update Expense Form to Use Dynamic Categories

**Files to modify:**
- `src/components/expenses/expense-form.tsx` (if exists from Phase 3)
- Or create category/project selection hooks

**Files to create:**
- `src/hooks/use-categories.ts` - Hook to fetch categories
- `src/hooks/use-projects.ts` - Hook to fetch projects

**Implementation:**

```typescript
// src/hooks/use-categories.ts
'use client'

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useCategories() {
  const { data, error, isLoading } = useSWR('/api/qbo/categories', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute
  })

  return {
    categories: data?.categories || [],
    source: data?.source || 'loading',
    warning: data?.warning,
    isLoading,
    isError: error,
  }
}
```

```typescript
// src/hooks/use-projects.ts
'use client'

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useProjects() {
  const { data, error, isLoading } = useSWR('/api/qbo/projects', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  return {
    projects: data?.projects || [],
    source: data?.source || 'loading',
    warning: data?.warning,
    isLoading,
    isError: error,
  }
}
```

Update expense form to use hooks instead of hardcoded imports.

**Acceptance Criteria:**
- [ ] Categories fetched dynamically via hook
- [ ] Projects fetched dynamically via hook
- [ ] Fallback to hardcoded if QBO unavailable
- [ ] Loading states handled

---

### Task 12: Add SWR Dependency

**Files to modify:**
- `package.json` - Add SWR for data fetching

```bash
npm install swr
```

**Acceptance Criteria:**
- [ ] SWR installed
- [ ] Hooks work with SWR caching

---

### Task 13: Write Unit Tests

**Files to create:**
- `src/lib/qbo/__tests__/encryption.test.ts`
- `src/lib/qbo/__tests__/client.test.ts`
- `src/lib/db/queries/__tests__/qbo-tokens.test.ts`
- `src/lib/db/queries/__tests__/qbo-cache.test.ts`

**Test cases:**

**Encryption tests:**
- Encrypt/decrypt roundtrip preserves data
- Different data produces different encrypted values
- Missing encryption key throws error

**Cache tests:**
- Cache stores and retrieves data
- Expired cache returns null
- Cache invalidation works

**Token tests:**
- Tokens save with encryption
- Tokens retrieve with decryption
- Connection status check works

**Acceptance Criteria:**
- [ ] 80%+ coverage on QBO utilities
- [ ] All edge cases tested
- [ ] Error conditions handled

---

### Task 14: Write Integration Tests

**Files to create:**
- `src/app/api/qbo/__tests__/categories.test.ts`
- `src/app/api/qbo/__tests__/projects.test.ts`
- `src/app/api/qbo/__tests__/status.test.ts`

**Test cases:**

**API route tests (with MSW mocking):**
- Categories endpoint returns QBO data when connected
- Categories endpoint returns hardcoded when disconnected
- Categories endpoint returns cached on QBO error
- Projects endpoint behaves similarly
- Status endpoint returns correct connection info
- Auth required for all endpoints
- Admin required for sync endpoint

**Acceptance Criteria:**
- [ ] All API routes tested
- [ ] Mock QBO API responses with MSW
- [ ] Auth/authz scenarios covered

---

## File Summary

### New Files (25)

```
# QBO Core
src/lib/qbo/client.ts
src/lib/qbo/types.ts
src/lib/qbo/encryption.ts
src/lib/qbo/service.ts

# Database Queries
src/lib/db/queries/qbo-tokens.ts
src/lib/db/queries/qbo-cache.ts

# API Routes
src/app/api/qbo/auth/route.ts
src/app/api/qbo/callback/route.ts
src/app/api/qbo/disconnect/route.ts
src/app/api/qbo/categories/route.ts
src/app/api/qbo/projects/route.ts
src/app/api/qbo/sync/route.ts
src/app/api/qbo/status/route.ts

# Admin Pages
src/app/(protected)/admin/layout.tsx
src/app/(protected)/admin/qbo/page.tsx

# Admin Components
src/components/admin/qbo-connection-card.tsx
src/components/admin/qbo-cache-status.tsx
src/components/admin/qbo-sync-button.tsx

# Hooks
src/hooks/use-categories.ts
src/hooks/use-projects.ts

# Tests
src/lib/qbo/__tests__/encryption.test.ts
src/lib/qbo/__tests__/client.test.ts
src/lib/db/queries/__tests__/qbo-tokens.test.ts
src/lib/db/queries/__tests__/qbo-cache.test.ts
src/app/api/qbo/__tests__/categories.test.ts
```

### Modified Files (4)

```
package.json - Add intuit-oauth, crypto-js, swr
.env.example - Add QBO environment variables
src/components/layout/nav.tsx - Add admin link
src/components/expenses/expense-form.tsx - Use dynamic categories (if exists)
```

---

## Requirements Traceability

| Requirement | Acceptance Criteria | Tasks |
|-------------|---------------------|-------|
| R5.1 | Fetch categories from QBO chart of accounts | 5, 7 |
| R5.2 | Cache categories with refresh interval | 4, 5 |
| R5.3 | No separate category list in app database | Architecture |
| R5.4 | Display categories in searchable dropdown | 11 |
| R5.5 | Handle QBO unavailability with cached data | 5, 7 |
| R6.1 | Fetch active projects from QBO | 5, 7 |
| R6.2 | Cache projects with refresh interval | 4, 5 |
| R6.3 | Display projects in searchable dropdown | 11 |
| R6.5 | Handle orgs with no projects | 7 |
| R10.1 | Authenticate with QBO via OAuth 2.0 | 2, 6 |
| R10.2 | Store and refresh QBO tokens securely | 2, 3, 5 |

**Design principles satisfied:**
- P1: QBO as Source of Truth for Reference Data
- P4: Fail Gracefully, Retry Explicitly

---

## Correctness Properties to Verify

- **CP9**: For any expense E, E.category must reference a valid account ID from the QBO chart of accounts.
  - Enforced by: Categories fetched from QBO, validated in expense form

---

## Definition of Done

- [ ] QBO OAuth flow works end-to-end (connect, callback, store tokens)
- [ ] Tokens stored encrypted in database
- [ ] Tokens refresh automatically before expiry
- [ ] Categories fetched from QBO chart of accounts
- [ ] Projects (Classes) fetched from QBO
- [ ] Cache expires after 1 hour, then refreshes
- [ ] Graceful fallback to hardcoded categories when QBO unavailable
- [ ] Admin page for QBO connection management
- [ ] Manual sync button for admins
- [ ] Navigation shows admin link for admins
- [ ] Expense form uses dynamic categories/projects
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] No ESLint errors
- [ ] Code formatted with Prettier

---

## Execution Order

Recommended implementation sequence:

1. **Environment Setup** (Task 1): Dependencies, env vars
2. **QBO Client Foundation** (Tasks 2-4): Client, encryption, database operations
3. **QBO Service Layer** (Task 5): High-level operations with token refresh
4. **OAuth Flow** (Task 6): Auth initiation, callback, disconnect
5. **Category/Project APIs** (Task 7): Data endpoints with fallback
6. **Admin UI** (Tasks 8-10): Layout, page, components, navigation
7. **Frontend Integration** (Tasks 11-12): Hooks, expense form update
8. **Testing** (Tasks 13-14): Unit and integration tests

---

## External Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| intuit-oauth | latest | QBO OAuth 2.0 client |
| crypto-js | latest | Token encryption |
| swr | latest | Client-side data fetching |

---

## Notes

- **Sandbox first**: Start development with QBO Sandbox environment, switch to production after testing.

- **Token refresh**: The service layer automatically refreshes tokens within 5 minutes of expiry. This prevents most auth failures during normal usage.

- **Cache strategy**: 1-hour TTL provides balance between freshness and API quota. Cache is checked before every API call.

- **Fallback chain**: QBO API → Cache → Hardcoded. Users always have category options available.

- **Phase 10 dependency**: Bill sync (Phase 10) will build on this foundation. The service layer and token management will be reused.

- **Security**: Tokens are encrypted with AES before database storage. Encryption key must be kept secret and rotated if compromised.
