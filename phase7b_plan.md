# Phase 7b: QuickBooks Online Production Approval

> **Goal**: Complete Intuit's app assessment process and configure production environment.
>
> **Deliverable**: App approved for production QBO access; OAuth flow works with production credentials.

---

## Prerequisites Verification

Before starting Phase 7b, verify these Phase 7 deliverables are working:

- [ ] QBO OAuth flow works in sandbox (connect, callback, token storage)
- [ ] Tokens stored encrypted in database (`qbo_tokens` table)
- [ ] Token refresh works automatically (5-minute buffer)
- [ ] Categories fetched from QBO sandbox chart of accounts
- [ ] Projects (Classes) fetched from QBO sandbox
- [ ] Cache expires after 1 hour and refreshes correctly
- [ ] Admin QBO management page accessible at `/admin/qbo`
- [ ] Manual sync button works
- [ ] Fallback to hardcoded categories works when disconnected

**Verification command:**
```bash
# Start dev server and test manually:
npm run dev
# Navigate to /admin/qbo, connect to QBO sandbox, verify sync works
```

---

## External Setup Required (Manual Steps)

### Intuit Developer Portal Steps

These tasks require human interaction with the Intuit Developer Portal and cannot be automated:

1. **Complete App Assessment Questionnaire**
   - Log in to https://developer.intuit.com/
   - Navigate to your app's settings
   - Fill out the production assessment questionnaire
   - Questions typically cover: data usage, security practices, support plans

2. **Submit Production URLs**
   - App URL: `https://[production-domain]/`
   - Redirect URI: `https://[production-domain]/api/qbo/callback`
   - Privacy Policy: `https://[production-domain]/privacy`
   - Terms of Service: `https://[production-domain]/terms`

3. **Prepare App Branding**
   - App logo (150x150px minimum, PNG or JPG)
   - App description (clear, professional, explains purpose)
   - App support contact information

4. **Wait for Approval**
   - Intuit review can take several days to weeks
   - Be prepared to respond to reviewer questions
   - May need to demonstrate the app to reviewers

5. **Obtain Production Credentials**
   - Once approved, note the production Client ID and Client Secret
   - These will be different from sandbox credentials

---

## Task Breakdown

### Task 1: Create Privacy Policy Page

**Files to create:**
- `src/app/privacy/page.tsx` - Privacy policy page (public route)

**Implementation:**

```typescript
// src/app/privacy/page.tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Expense Reports',
  description: 'Privacy policy for the Expense Reports application',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

      <div className="prose prose-slate max-w-none">
        <p className="text-muted-foreground mb-6">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
          <p>
            Expense Reports Homegrown (&quot;the Application&quot;) is an internal expense management
            system operated by Renewal Initiatives. This privacy policy explains how we collect,
            use, and protect your information when you use the Application.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>
          <h3 className="text-lg font-medium mb-2">Account Information</h3>
          <p className="mb-4">
            We receive your name, email address, and role information from our authentication
            provider (Zitadel) when you sign in with your Renewal Initiatives credentials.
          </p>

          <h3 className="text-lg font-medium mb-2">Expense Data</h3>
          <p className="mb-4">
            We collect expense report information you submit, including:
          </p>
          <ul className="list-disc list-inside mb-4">
            <li>Expense amounts, dates, and descriptions</li>
            <li>Receipt images you upload</li>
            <li>Mileage information (addresses, distances)</li>
            <li>Category and project assignments</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">3. QuickBooks Online Integration</h2>
          <p className="mb-4">
            This Application connects to QuickBooks Online (QBO) to:
          </p>
          <ul className="list-disc list-inside mb-4">
            <li>Fetch expense categories from your chart of accounts</li>
            <li>Fetch project/class information for expense tracking</li>
            <li>Create bills in QBO for approved expense reports</li>
          </ul>

          <h3 className="text-lg font-medium mb-2">QBO Data Access</h3>
          <p className="mb-4">
            We access the following QBO data:
          </p>
          <ul className="list-disc list-inside mb-4">
            <li>Chart of Accounts (expense account names and IDs)</li>
            <li>Classes/Projects (names and IDs)</li>
            <li>We create Bills in QBO for approved expense reports</li>
          </ul>

          <h3 className="text-lg font-medium mb-2">QBO Token Security</h3>
          <p>
            OAuth tokens used to access QuickBooks Online are encrypted using AES-256
            encryption before storage in our database. Tokens are automatically refreshed
            before expiration and can be revoked by administrators at any time.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">4. Data Storage and Security</h2>
          <p className="mb-4">
            Your data is stored securely using:
          </p>
          <ul className="list-disc list-inside mb-4">
            <li>Vercel Postgres database with encryption at rest</li>
            <li>Vercel Blob storage for receipt images (signed URLs)</li>
            <li>HTTPS encryption for all data in transit</li>
            <li>Role-based access controls</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">5. Data Retention</h2>
          <p>
            Expense reports and associated data are retained indefinitely for accounting
            and audit purposes. Receipt images are stored as long as the associated expense
            report exists. You may request deletion of your data by contacting your administrator.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">6. Third-Party Services</h2>
          <p className="mb-4">We use the following third-party services:</p>
          <ul className="list-disc list-inside mb-4">
            <li><strong>Zitadel</strong> - Authentication (SSO)</li>
            <li><strong>QuickBooks Online</strong> - Accounting integration</li>
            <li><strong>Anthropic (Claude Vision)</strong> - Receipt data extraction</li>
            <li><strong>Google Maps</strong> - Mileage distance calculation</li>
            <li><strong>Vercel</strong> - Hosting, database, and file storage</li>
          </ul>
          <p>
            Each of these services has their own privacy policies governing their use of data.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">7. Access and Sharing</h2>
          <p>
            Your expense data is accessible only to you and administrators of the Application.
            Approved expense reports are synced to QuickBooks Online where they become visible
            to users with appropriate QBO permissions. We do not sell or share your personal
            information with third parties for marketing purposes.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">8. Contact</h2>
          <p>
            For questions about this privacy policy or your data, please contact your
            system administrator or email:{' '}
            <a href="mailto:admin@renewalinitiatives.org" className="text-primary hover:underline">
              admin@renewalinitiatives.org
            </a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">9. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. Changes will be posted
            on this page with an updated revision date.
          </p>
        </section>
      </div>
    </div>
  )
}
```

**Acceptance Criteria:**
- [ ] Privacy policy page accessible at `/privacy` (public route)
- [ ] Page explains QBO data access clearly
- [ ] Page describes token security practices
- [ ] Page lists all third-party services used
- [ ] Contact information provided

---

### Task 2: Create Terms of Service Page

**Files to create:**
- `src/app/terms/page.tsx` - Terms of service page (public route)

**Implementation:**

```typescript
// src/app/terms/page.tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | Expense Reports',
  description: 'Terms of service for the Expense Reports application',
}

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

      <div className="prose prose-slate max-w-none">
        <p className="text-muted-foreground mb-6">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' , year: 'numeric' })}
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing and using Expense Reports Homegrown (&quot;the Application&quot;),
            you agree to be bound by these Terms of Service. If you do not agree to these
            terms, please do not use the Application.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
          <p>
            The Application is an internal expense management system for Renewal Initiatives
            employees. It allows users to submit expense reports for out-of-pocket purchases
            and mileage reimbursement, which are then routed through an approval workflow
            and synced to QuickBooks Online.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">3. Eligibility</h2>
          <p>
            The Application is available only to authorized Renewal Initiatives employees
            and contractors with valid credentials. Access requires authentication through
            the organization&apos;s identity provider (Zitadel).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">4. User Responsibilities</h2>
          <p className="mb-4">As a user of the Application, you agree to:</p>
          <ul className="list-disc list-inside mb-4">
            <li>Submit only accurate and truthful expense information</li>
            <li>Upload only legitimate receipts for actual business expenses</li>
            <li>Not share your account credentials with others</li>
            <li>Report any suspected fraudulent activity immediately</li>
            <li>Comply with your organization&apos;s expense policies</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">5. QuickBooks Online Integration</h2>
          <p className="mb-4">
            The Application integrates with QuickBooks Online (QBO) to sync expense data.
            By using this Application, you acknowledge that:
          </p>
          <ul className="list-disc list-inside mb-4">
            <li>Approved expense reports will be created as bills in QBO</li>
            <li>Your expense data will be visible to users with QBO access</li>
            <li>Categories and projects are sourced from QBO and may change</li>
            <li>QBO integration is managed by administrators</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">6. AI-Powered Features</h2>
          <p className="mb-4">
            The Application uses AI (Claude Vision) to extract data from receipt images.
            You understand that:
          </p>
          <ul className="list-disc list-inside mb-4">
            <li>AI extraction may not always be accurate</li>
            <li>You are responsible for verifying all extracted data before submission</li>
            <li>Receipt images are processed by Anthropic&apos;s Claude Vision API</li>
            <li>Confidence indicators are provided but should not be solely relied upon</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">7. Intellectual Property</h2>
          <p>
            The Application and its original content, features, and functionality are
            owned by Renewal Initiatives. The Application is intended for internal use only.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Renewal Initiatives shall not be liable
            for any indirect, incidental, special, consequential, or punitive damages resulting
            from your use of the Application, including but not limited to errors in expense
            calculations, data loss, or QBO sync failures.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">9. Service Availability</h2>
          <p>
            We strive to maintain high availability but do not guarantee uninterrupted service.
            The Application may be temporarily unavailable for maintenance, updates, or due to
            circumstances beyond our control.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">10. Termination</h2>
          <p>
            Access to the Application may be terminated or suspended at any time, with or
            without cause, if you violate these terms or at the discretion of the organization.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">11. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use of the
            Application after changes constitutes acceptance of the modified terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">12. Contact</h2>
          <p>
            For questions about these terms, please contact:{' '}
            <a href="mailto:admin@renewalinitiatives.org" className="text-primary hover:underline">
              admin@renewalinitiatives.org
            </a>
          </p>
        </section>
      </div>
    </div>
  )
}
```

**Acceptance Criteria:**
- [ ] Terms of service page accessible at `/terms` (public route)
- [ ] Page covers QBO integration clearly
- [ ] Page addresses AI-powered features
- [ ] Page defines user responsibilities
- [ ] Contact information provided

---

### Task 3: Add Footer Links to Privacy and Terms

**Files to modify:**
- `src/components/layout/footer.tsx` (create if doesn't exist)
- `src/app/layout.tsx` or main layout to include footer

**Implementation:**

```typescript
// src/components/layout/footer.tsx
import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Renewal Initiatives. All rights reserved.
          </p>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
```

**Acceptance Criteria:**
- [ ] Footer component created with links to privacy and terms
- [ ] Footer included in main layout
- [ ] Links work correctly

---

### Task 4: Create Environment Configuration for Production

**Files to modify:**
- `.env.example` - Add production-specific variables
- `.env.production.local.example` - Create production example file

**Implementation:**

Add to `.env.example`:
```bash
# ===========================================
# QuickBooks Online API - Production Settings
# ===========================================

# Set to 'production' for live QBO data
QBO_ENVIRONMENT=sandbox

# Production credentials (obtain after Intuit approval)
# QBO_CLIENT_ID_PRODUCTION=
# QBO_CLIENT_SECRET_PRODUCTION=

# Production redirect URI (update in Intuit portal)
# QBO_REDIRECT_URI_PRODUCTION=https://your-domain.com/api/qbo/callback
```

Create `.env.production.example`:
```bash
# ===========================================
# Production Environment Variables
# ===========================================
# Copy this to your Vercel environment variables

# QuickBooks Online - Production
QBO_ENVIRONMENT=production
QBO_CLIENT_ID=your_production_client_id
QBO_CLIENT_SECRET=your_production_client_secret
QBO_REDIRECT_URI=https://your-production-domain.com/api/qbo/callback
QBO_ENCRYPTION_KEY=your_production_encryption_key

# Note: Generate a NEW encryption key for production
# openssl rand -base64 32
```

**Acceptance Criteria:**
- [ ] Production environment variables documented
- [ ] Clear instructions for obtaining production credentials
- [ ] Reminder to generate new encryption key for production

---

### Task 5: Create Security Documentation for Intuit Review

**Files to create:**
- `docs/security-practices.md` - Security documentation for Intuit reviewers

**Implementation:**

```markdown
# Security Practices - Expense Reports Homegrown

This document describes the security practices implemented in the Expense Reports
application for Intuit's app assessment review.

## 1. OAuth Token Security

### Token Storage
- OAuth access and refresh tokens are **encrypted at rest** using AES-256 encryption
- Encryption is performed before database storage using the `crypto-js` library
- A unique encryption key is used per environment (development/production)
- The encryption key is stored as an environment variable, never in code

### Token Lifecycle
- Tokens are automatically refreshed 5 minutes before expiration
- Refresh tokens are used to obtain new access tokens without user intervention
- On disconnect, both tokens are securely deleted from the database
- Token expiration is tracked and displayed to administrators

### Implementation Details
Location: `src/lib/qbo/encryption.ts`
```typescript
// Tokens are encrypted before storage
const encrypted = CryptoJS.AES.encrypt(token, encryptionKey).toString()

// Tokens are decrypted only when needed for API calls
const decrypted = CryptoJS.AES.decrypt(encrypted, encryptionKey)
```

## 2. Authentication & Authorization

### Authentication
- Users authenticate via Zitadel OIDC (OpenID Connect)
- No passwords are stored in the application
- Session management handled by NextAuth.js v5 with secure cookies

### Authorization
- Role-based access control (RBAC) with two roles: `user` and `admin`
- QBO connection management restricted to admin users only
- OAuth flow endpoints verify admin role before proceeding
- API endpoints validate session and role before processing requests

### CSRF Protection
- OAuth state parameter used to prevent CSRF attacks
- State is generated cryptographically and stored in httpOnly cookie
- Callback validates state matches before processing tokens

## 3. Data Protection

### Data at Rest
- Database: Vercel Postgres with encryption at rest
- File Storage: Vercel Blob with signed URLs (time-limited access)
- Sensitive fields (OAuth tokens) additionally encrypted at application level

### Data in Transit
- All traffic served over HTTPS (enforced by Vercel)
- API calls to QBO use HTTPS exclusively
- No sensitive data transmitted in URL parameters

### Data Access
- Users can only access their own expense reports
- Admins can view all reports for approval purposes
- QBO data (categories, projects) cached and available to all authenticated users

## 4. QBO Data Usage

### Data Accessed
- **Chart of Accounts**: Read expense account names/IDs for category selection
- **Classes**: Read class/project names/IDs for expense tracking
- **Bills**: Create bills for approved expense reports

### Data Caching
- Categories and projects cached for 1 hour to reduce API calls
- Cache automatically refreshes after expiration
- Manual refresh available to administrators
- Cache invalidated on QBO disconnect

### Data Not Accessed
- We do NOT access bank account information
- We do NOT access customer data
- We do NOT access payroll information
- We do NOT access payment data

## 5. Logging & Monitoring

### What We Log
- API errors (without sensitive data)
- OAuth flow failures (state mismatch, token exchange errors)
- QBO API errors (status codes, error types)
- User actions (report submission, approval)

### What We Don't Log
- OAuth tokens (access or refresh)
- User passwords (we don't handle passwords)
- Full receipt images (only references)
- Personal identifying information beyond user IDs

## 6. Error Handling

### Graceful Degradation
- QBO unavailability falls back to cached data, then hardcoded defaults
- OAuth failures redirect with user-friendly error messages
- API failures return structured error responses

### User Communication
- Clear error messages without exposing internal details
- Retry options for transient failures
- Admin notification for connection issues

## 7. Development Practices

### Code Security
- All user input validated with Zod schemas
- SQL injection prevented by Drizzle ORM parameterized queries
- XSS prevented by React's default escaping
- Dependencies regularly updated

### Environment Separation
- Separate sandbox and production QBO credentials
- Different encryption keys per environment
- Environment-specific redirect URIs

## 8. Incident Response

### Token Compromise
If OAuth tokens are suspected compromised:
1. Admin disconnects QBO from `/admin/qbo`
2. All tokens immediately deleted from database
3. Reconnect generates fresh tokens
4. Previous tokens automatically invalidated by QBO

### Key Rotation
To rotate the encryption key:
1. Disconnect QBO (deletes encrypted tokens)
2. Update `QBO_ENCRYPTION_KEY` environment variable
3. Reconnect QBO (generates new tokens with new key)

## 9. Contact

For security questions or to report vulnerabilities:
- Email: admin@renewalinitiatives.org
- Application: Expense Reports Homegrown
- Developer: Renewal Initiatives
```

**Acceptance Criteria:**
- [ ] Security documentation covers token storage and encryption
- [ ] Documentation explains CSRF protection
- [ ] Documentation describes data access scope
- [ ] Documentation ready for Intuit reviewer

---

### Task 6: Update QBO Client for Environment Switching

**Files to modify:**
- `src/lib/qbo/client.ts` - Ensure proper environment handling

**Implementation:**

Update to handle environment more explicitly:

```typescript
// src/lib/qbo/client.ts - verify these checks exist

export function isQboConfigured(): boolean {
  const required = ['QBO_CLIENT_ID', 'QBO_CLIENT_SECRET', 'QBO_REDIRECT_URI', 'QBO_ENCRYPTION_KEY']
  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    console.warn(`QBO not configured. Missing: ${missing.join(', ')}`)
    return false
  }

  return true
}

export function getQboEnvironment(): 'sandbox' | 'production' {
  const env = process.env.QBO_ENVIRONMENT
  if (env === 'production') return 'production'
  return 'sandbox'
}
```

**Acceptance Criteria:**
- [ ] Environment detection works correctly
- [ ] Clear logging when configuration is missing
- [ ] Proper URL selection based on environment

---

### Task 7: Add QBO Debug/Health Endpoint

**Files to modify:**
- `src/app/api/qbo/debug/route.ts` - Enhance for production debugging

**Implementation:**

```typescript
// src/app/api/qbo/debug/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isQboConfigured, getQboEnvironment } from '@/lib/qbo/client'
import { getQboTokens, isTokenExpiringSoon } from '@/lib/db/queries/qbo-tokens'
import { getCacheStatus } from '@/lib/db/queries/qbo-cache'

export async function GET() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const tokens = await getQboTokens()
  const cacheStatus = await getCacheStatus()
  const expiringSoon = tokens ? await isTokenExpiringSoon() : false

  return NextResponse.json({
    environment: getQboEnvironment(),
    configured: isQboConfigured(),
    connected: tokens !== null,
    realmId: tokens?.realmId || null,
    tokenStatus: tokens ? {
      expiresAt: tokens.expiresAt,
      expiringSoon,
      updatedBy: tokens.updatedBy,
    } : null,
    cacheStatus: {
      categories: {
        cached: cacheStatus.categories.cached,
        expiresAt: cacheStatus.categories.expiresAt,
      },
      projects: {
        cached: cacheStatus.projects.cached,
        expiresAt: cacheStatus.projects.expiresAt,
      },
    },
    // Don't expose actual tokens
  })
}
```

**Acceptance Criteria:**
- [ ] Debug endpoint shows environment (sandbox/production)
- [ ] Debug endpoint shows connection status details
- [ ] Debug endpoint does NOT expose tokens
- [ ] Admin-only access

---

### Task 8: Add Error Monitoring Configuration

**Files to create:**
- `src/lib/monitoring.ts` - Error reporting utilities

**Implementation:**

```typescript
// src/lib/monitoring.ts
type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical'

interface ErrorContext {
  userId?: string
  action?: string
  [key: string]: unknown
}

export function logQboError(
  error: Error | string,
  severity: ErrorSeverity,
  context: ErrorContext = {}
): void {
  const errorMessage = error instanceof Error ? error.message : error
  const timestamp = new Date().toISOString()

  // Structured logging for production monitoring
  const logEntry = {
    timestamp,
    severity,
    service: 'qbo',
    message: errorMessage,
    ...context,
    // Don't log stack traces in production
    stack: process.env.NODE_ENV === 'development' && error instanceof Error
      ? error.stack
      : undefined,
  }

  // In production, this would send to a monitoring service
  // For now, use console with proper formatting
  if (severity === 'critical' || severity === 'error') {
    console.error('[QBO]', JSON.stringify(logEntry))
  } else if (severity === 'warning') {
    console.warn('[QBO]', JSON.stringify(logEntry))
  } else {
    console.log('[QBO]', JSON.stringify(logEntry))
  }

  // TODO: In production, integrate with:
  // - Vercel Analytics
  // - Sentry
  // - Or other monitoring service
}

export function logQboApiCall(
  endpoint: string,
  success: boolean,
  durationMs: number,
  context: ErrorContext = {}
): void {
  logQboError(
    `API call to ${endpoint}: ${success ? 'success' : 'failed'} (${durationMs}ms)`,
    success ? 'info' : 'warning',
    { endpoint, success, durationMs, ...context }
  )
}
```

**Update QBO service to use monitoring:**

```typescript
// In src/lib/qbo/service.ts, add monitoring calls:
import { logQboError, logQboApiCall } from '@/lib/monitoring'

// Example usage in fetchCategories:
export async function fetchCategories(): Promise<QboCategory[]> {
  const startTime = Date.now()

  try {
    // ... existing code ...

    logQboApiCall('categories', true, Date.now() - startTime)
    return categories
  } catch (error) {
    logQboApiCall('categories', false, Date.now() - startTime)
    logQboError(error as Error, 'error', { action: 'fetchCategories' })
    throw error
  }
}
```

**Acceptance Criteria:**
- [ ] Error logging utility created
- [ ] QBO API calls logged with timing
- [ ] Errors logged with appropriate severity
- [ ] Sensitive data (tokens) never logged

---

### Task 9: Create Production Deployment Checklist

**Files to create:**
- `docs/production-checklist.md` - Deployment verification checklist

**Implementation:**

```markdown
# Production Deployment Checklist

Use this checklist when deploying to production with QBO integration.

## Pre-Deployment

### Environment Variables (Vercel Dashboard)

- [ ] `QBO_ENVIRONMENT` set to `production`
- [ ] `QBO_CLIENT_ID` set to production client ID (from Intuit portal)
- [ ] `QBO_CLIENT_SECRET` set to production client secret
- [ ] `QBO_REDIRECT_URI` set to `https://your-domain.com/api/qbo/callback`
- [ ] `QBO_ENCRYPTION_KEY` set to new production-specific key
  ```bash
  # Generate new key:
  openssl rand -base64 32
  ```

### Intuit Developer Portal

- [ ] Production app approved
- [ ] Redirect URI updated to production URL
- [ ] App branding/logo uploaded
- [ ] Privacy policy URL submitted
- [ ] Terms of service URL submitted

### Vercel Dashboard

- [ ] Custom domain configured
- [ ] SSL certificate active (automatic with Vercel)
- [ ] Environment variables set for production

## Post-Deployment Verification

### Public Pages

- [ ] `/privacy` - Privacy policy loads correctly
- [ ] `/terms` - Terms of service loads correctly
- [ ] Both pages are accessible without authentication

### QBO Connection (as admin)

- [ ] Navigate to `/admin/qbo`
- [ ] Click "Connect to QuickBooks"
- [ ] Complete OAuth flow with production QBO account
- [ ] Verify "Connected" status displayed
- [ ] Verify realmId shown is correct production company

### Data Sync

- [ ] Click "Sync Now" button
- [ ] Verify categories loaded from production QBO
- [ ] Verify projects loaded from production QBO
- [ ] Check cache status shows fresh data

### Expense Flow

- [ ] Create new expense report
- [ ] Verify category dropdown shows QBO categories
- [ ] Verify project dropdown shows QBO projects
- [ ] Submit and approve an expense (test data)
- [ ] Verify bill created in production QBO

### Error Handling

- [ ] Disconnect QBO temporarily
- [ ] Verify fallback categories work
- [ ] Reconnect QBO
- [ ] Verify sync resumes

## Rollback Plan

If issues occur:

1. **QBO Issues Only**: Disconnect QBO from admin panel
   - App continues with hardcoded categories
   - Reconnect when issues resolved

2. **Full Rollback**: Revert to previous deployment
   ```bash
   vercel rollback
   ```

## Monitoring

- [ ] Check Vercel logs for QBO errors
- [ ] Monitor for OAuth token refresh failures
- [ ] Watch for elevated API error rates

## Post-Launch

- [ ] Schedule weekly check of QBO connection status
- [ ] Monitor for Intuit API deprecation notices
- [ ] Keep sandbox environment for testing changes
```

**Acceptance Criteria:**
- [ ] Checklist covers all deployment steps
- [ ] Verification steps included
- [ ] Rollback plan documented

---

### Task 10: Write Integration Tests for Production Scenarios

**Files to create:**
- `src/app/api/qbo/__tests__/production-scenarios.test.ts`

**Test cases:**

```typescript
// src/app/api/qbo/__tests__/production-scenarios.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('QBO Production Scenarios', () => {
  describe('Environment Configuration', () => {
    it('should use production URLs when QBO_ENVIRONMENT is production', () => {
      // Test that getBaseUrl returns production URL
    })

    it('should validate all required env vars are present', () => {
      // Test isQboConfigured with missing vars
    })
  })

  describe('Token Security', () => {
    it('should encrypt tokens before storage', () => {
      // Verify encrypted value differs from original
    })

    it('should decrypt tokens correctly for API use', () => {
      // Verify roundtrip encryption works
    })

    it('should fail gracefully with wrong encryption key', () => {
      // Test decryption with wrong key throws
    })
  })

  describe('Graceful Degradation', () => {
    it('should fall back to cache when QBO API fails', () => {
      // Mock API failure, verify cache used
    })

    it('should fall back to hardcoded when cache expired and API fails', () => {
      // Mock both failures, verify hardcoded returned
    })
  })

  describe('Debug Endpoint Security', () => {
    it('should not expose tokens in debug response', () => {
      // Verify tokens not in response
    })

    it('should require admin role', () => {
      // Test with non-admin session
    })
  })
})
```

**Acceptance Criteria:**
- [ ] Environment switching tested
- [ ] Token encryption tested
- [ ] Fallback scenarios tested
- [ ] Security of debug endpoint tested

---

## File Summary

### New Files (8)

```
# Public Pages
src/app/privacy/page.tsx
src/app/terms/page.tsx

# Layout Components
src/components/layout/footer.tsx

# Utilities
src/lib/monitoring.ts

# Documentation
docs/security-practices.md
docs/production-checklist.md
.env.production.example

# Tests
src/app/api/qbo/__tests__/production-scenarios.test.ts
```

### Modified Files (4)

```
.env.example - Add production variables documentation
src/lib/qbo/client.ts - Add environment helpers
src/lib/qbo/service.ts - Add monitoring integration
src/app/api/qbo/debug/route.ts - Enhance for production
```

---

## Requirements Traceability

| Requirement | Acceptance Criteria | Tasks |
|-------------|---------------------|-------|
| R10.1 | Authenticate with QBO via OAuth 2.0 (production) | 4, 6 |
| R10.2 | Store and refresh QBO tokens securely | 5 (documented) |
| R15.3 | Handle API failures with user-friendly messages | 8 |
| R15.5 | Log errors for debugging | 8 |

**Design principles satisfied:**
- P4: Fail Gracefully, Retry Explicitly (fallback chain)
- Security documentation for Intuit review

---

## Correctness Properties to Verify

- **Token Security**: OAuth tokens encrypted at rest with AES-256
- **Environment Isolation**: Sandbox and production use separate credentials
- **Graceful Degradation**: App functions without QBO (hardcoded fallback)

---

## Definition of Done

- [ ] Privacy policy page created and accessible at `/privacy`
- [ ] Terms of service page created and accessible at `/terms`
- [ ] Footer links to privacy and terms added
- [ ] Security documentation prepared for Intuit review
- [ ] Production environment variables documented
- [ ] Debug endpoint enhanced for production troubleshooting
- [ ] Error monitoring utilities created
- [ ] Production deployment checklist created
- [ ] Integration tests for production scenarios written
- [ ] Intuit app assessment questionnaire completed (manual)
- [ ] Production OAuth credentials obtained (manual, after Intuit approval)
- [ ] Production environment variables configured in Vercel (manual)
- [ ] OAuth flow tested with production credentials (manual)
- [ ] Category and project sync verified in production (manual)

---

## Execution Order

### Automated Tasks (Can implement immediately)

1. **Task 1**: Create privacy policy page
2. **Task 2**: Create terms of service page
3. **Task 3**: Add footer with links
4. **Task 4**: Document production environment variables
5. **Task 5**: Create security documentation
6. **Task 6**: Update QBO client for environment handling
7. **Task 7**: Enhance debug endpoint
8. **Task 8**: Add error monitoring
9. **Task 9**: Create production checklist
10. **Task 10**: Write integration tests

### Manual Tasks (Require Intuit portal access)

1. **Complete Intuit app assessment** - Follow questionnaire in developer portal
2. **Submit production URLs** - After privacy/terms pages deployed
3. **Wait for Intuit approval** - May take days to weeks
4. **Obtain production credentials** - After approval
5. **Configure Vercel** - Set production environment variables
6. **Test production flow** - End-to-end OAuth with production QBO

---

## Notes

- **Timeline**: Intuit approval can take several days to weeks. Start this phase early to avoid blocking Phase 10 (Bill Sync).

- **Privacy Policy**: The provided template is a starting point. Consider legal review for production use.

- **Terms of Service**: Similarly, legal review recommended before production deployment.

- **Sandbox Preservation**: Keep sandbox credentials and environment for ongoing development and testing even after production approval.

- **Encryption Key**: Generate a NEW encryption key for production. Never reuse the development key.

- **Monitoring**: The monitoring utilities are basic console logging. For production, consider integrating with Vercel Analytics, Sentry, or similar service.

---

## External Dependencies

| Dependency | Purpose | Status |
|------------|---------|--------|
| Intuit Developer Portal | Production app approval | Manual process |
| Vercel | Environment variable configuration | Ready |
| Production QBO Account | Testing with real data | Requires approval |
