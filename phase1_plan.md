# Phase 1 Execution Plan: Project Scaffolding & Authentication

> **Goal**: Set up the Next.js project with Zitadel SSO authentication working end-to-end.

## Prerequisites Verification

- [x] Phase 0 complete (technology_decisions.md exists)
- [ ] Zitadel admin access available
- [ ] Anthropic API key available (for later phases, but good to confirm)

---

## Requirements Addressed

This phase satisfies **R1: User Authentication** completely:

| Acceptance Criteria                                | How Addressed                                        |
| -------------------------------------------------- | ---------------------------------------------------- |
| R1.1: Authenticate via Zitadel OIDC                | NextAuth.js v5 configured with Zitadel provider      |
| R1.2: Require `app:expense-reports-homegrown` role | Middleware checks for role in session                |
| R1.3: Identify `admin` role users as approvers     | Role extracted from Zitadel token, stored in session |
| R1.4: Support SSO with App Portal                  | Same Zitadel project, shared session cookies         |
| R1.5: Redirect unauthenticated users               | NextAuth middleware protects routes                  |

This phase partially satisfies **R16: Accessibility and UX**:

| Acceptance Criteria                      | How Addressed                                               |
| ---------------------------------------- | ----------------------------------------------------------- |
| R16.1: WCAG 2.1 AA guidelines            | shadcn/ui components built on Radix (accessible by default) |
| R16.2: Keyboard navigation               | Radix primitives handle keyboard interactions               |
| R16.6: Renewal Initiatives design system | Forest green (#2c5530), shadcn/ui, system fonts             |

---

## Task Breakdown

### Task 1.1: Initialize Next.js Project

**Description**: Create the Next.js 16+ project with TypeScript and App Router.

**Commands**:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

**Files Created**:

- `package.json` - Project dependencies
- `tsconfig.json` - TypeScript configuration
- `next.config.ts` - Next.js configuration
- `src/app/layout.tsx` - Root layout
- `src/app/page.tsx` - Home page (will be replaced)
- `src/app/globals.css` - Global styles

**Verification**: `npm run dev` starts without errors.

---

### Task 1.2: Configure Tailwind CSS v4 and shadcn/ui

**Description**: Set up Tailwind CSS v4 with the Renewal Initiatives color scheme and install shadcn/ui.

**Commands**:

```bash
npx shadcn@latest init
```

**Configuration choices**:

- Style: Default
- Base color: Slate (we'll customize to forest green)
- CSS variables: Yes
- Tailwind config location: `tailwind.config.ts`
- Components location: `@/components`
- Utils location: `@/lib/utils`

**Files to Create/Modify**:

`tailwind.config.ts`:

```typescript
// Extend with forest green primary color (#2c5530)
// Configure light mode only (no dark mode)
```

`src/app/globals.css`:

```css
/* CSS variables for Renewal Initiatives branding */
:root {
  --primary: 142 35% 24%; /* #2c5530 in HSL */
  /* ... other theme variables */
}
```

`components.json`:

```json
{
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

**Install initial shadcn/ui components**:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dropdown-menu
npx shadcn@latest add avatar
npx shadcn@latest add separator
```

**Verification**: Components render with forest green primary color.

---

### Task 1.3: Set Up ESLint and Prettier

**Description**: Configure linting and formatting with project conventions.

**Files to Create**:

`.prettierrc`:

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

`.prettierignore`:

```
node_modules
.next
.vercel
```

`eslint.config.mjs` (ESLint 9 flat config):

```javascript
// Configure with Next.js recommended rules
// Add TypeScript rules
// Integrate Prettier
```

**Dependencies to Add**:

```bash
npm install -D prettier eslint-config-prettier eslint-plugin-prettier
```

**Scripts to Add** (package.json):

```json
{
  "scripts": {
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

**Verification**: `npm run lint` and `npm run format:check` pass.

---

### Task 1.4: Configure Git Settings

**Description**: Set up `.gitattributes` for consistent line endings and `.gitignore` for Next.js.

**Files to Create**:

`.gitattributes`:

```
* text=auto eol=lf
*.{cmd,[cC][mM][dD]} text eol=crlf
*.{bat,[bB][aA][tT]} text eol=crlf
```

**Verify `.gitignore`** includes:

```
# dependencies
/node_modules

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*

# local env files
.env*.local
.env

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
```

**Verification**: Git status shows clean working directory after initial commit.

---

### Task 1.5: Set Up NextAuth.js v5 with Zitadel

**Description**: Configure authentication with Zitadel OIDC provider.

**Dependencies to Add**:

```bash
npm install next-auth@beta
```

**Files to Create**:

`src/lib/auth.ts`:

```typescript
import NextAuth from 'next-auth'
import type { NextAuthConfig } from 'next-auth'

// Zitadel OIDC provider configuration
// Extract roles from ID token
// Map Zitadel roles to app roles (user, admin)
```

`src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

`src/types/next-auth.d.ts`:

```typescript
// Extend session types to include role
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: 'user' | 'admin'
    }
  }
}
```

**Environment Variables** (`.env.local`):

```
AUTH_SECRET=<generate with: openssl rand -base64 32>
AUTH_ZITADEL_ISSUER=https://[your-zitadel-instance]
AUTH_ZITADEL_CLIENT_ID=<from Zitadel>
AUTH_ZITADEL_CLIENT_SECRET=<from Zitadel>
NEXTAUTH_URL=http://localhost:3000
```

**Verification**: Auth endpoints respond at `/api/auth/*`.

---

### Task 1.6: Create Zitadel Application (External Setup)

**Description**: Register the application in Zitadel admin console.

**Steps** (manual, document for reference):

1. Log into Zitadel admin console
2. Navigate to Projects → Renewal Initiatives
3. Create new application:
   - Name: `expense-reports-homegrown`
   - Type: Web Application
   - Authentication method: Code (PKCE recommended)
4. Configure redirect URIs:
   - `http://localhost:3000/api/auth/callback/zitadel`
   - `https://[production-domain]/api/auth/callback/zitadel`
5. Create role: `app:expense-reports-homegrown`
6. Assign role to test users
7. Note Client ID and Client Secret

**Document Created**:
`docs/zitadel-setup.md` - Step-by-step Zitadel configuration guide

**Verification**: Can obtain tokens from Zitadel with correct roles.

---

### Task 1.7: Configure Role-Based Access

**Description**: Extract and validate roles from Zitadel tokens.

**Files to Modify**:

`src/lib/auth.ts`:

```typescript
// In callbacks.jwt:
// Extract roles from token claims
// Look for 'urn:zitadel:iam:org:project:roles' or similar claim
// Map to simplified role: 'admin' | 'user'

// In callbacks.session:
// Add role to session object
```

**Files to Create**:

`src/lib/auth-utils.ts`:

```typescript
// Helper functions:
// - isAdmin(session): boolean
// - requireAuth(session): void (throws if not authenticated)
// - requireAdmin(session): void (throws if not admin)
```

**Verification**: Session includes correct role for test users.

---

### Task 1.8: Create Basic Layout

**Description**: Build the application shell with header, navigation, and auth state display.

**Files to Create**:

`src/components/layout/header.tsx`:

```typescript
// App header with:
// - Logo/app name (left)
// - Navigation links (center) - placeholder for now
// - User menu (right): avatar, name, role badge, logout
```

`src/components/layout/user-menu.tsx`:

```typescript
// Dropdown menu with:
// - User avatar (from Zitadel or initials fallback)
// - User name and email
// - Role indicator (User/Admin badge)
// - Sign out button
```

`src/components/layout/nav.tsx`:

```typescript
// Navigation component (placeholder for now)
// Will be populated in later phases
```

`src/components/ui/role-badge.tsx`:

```typescript
// Badge component showing "Admin" or "User" role
// Uses forest green for admin, neutral for user
```

**Modify** `src/app/layout.tsx`:

```typescript
// Add SessionProvider wrapper
// Include Header component
// Add main content area with proper padding
```

**Verification**: Layout renders with header and user information.

---

### Task 1.9: Implement Protected Routes Middleware

**Description**: Protect all routes except public pages and auth endpoints.

**Files to Create**:

`src/middleware.ts`:

```typescript
import { auth } from '@/lib/auth'

export default auth((req) => {
  // Public routes: /login, /api/auth/*
  // Protected routes: everything else
  // If not authenticated, redirect to /login
  // If authenticated but missing required role, show error
})

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}
```

**Verification**: Unauthenticated users redirected to login; authenticated users can access protected pages.

---

### Task 1.10: Create Login/Logout Flow

**Description**: Build login page and handle authentication redirects.

**Files to Create**:

`src/app/login/page.tsx`:

```typescript
// Login page with:
// - Renewal Initiatives branding
// - "Sign in with Zitadel" button
// - Redirect to original URL after login
```

`src/app/(protected)/layout.tsx`:

```typescript
// Layout for protected routes
// Includes header with user menu
// Shows loading state while checking auth
```

`src/app/(protected)/page.tsx`:

```typescript
// Dashboard placeholder (will be built out in Phase 11)
// Shows: "Welcome, [name]!" and role indicator
// Confirms auth is working
```

**Verification**:

- Clicking "Sign in" redirects to Zitadel
- After Zitadel login, user returns to app with session
- Clicking "Sign out" clears session and redirects to login

---

## File Structure Summary

After Phase 1, the project structure should be:

```
expense-reports-homegrown/
├── .env.local                    # Environment variables (git-ignored)
├── .env.example                  # Template for env vars
├── .gitattributes                # LF line endings
├── .gitignore                    # Standard Next.js ignores
├── .prettierrc                   # Prettier configuration
├── .prettierignore               # Prettier ignore patterns
├── eslint.config.mjs             # ESLint flat config
├── next.config.ts                # Next.js configuration
├── package.json                  # Dependencies and scripts
├── tailwind.config.ts            # Tailwind with forest green theme
├── tsconfig.json                 # TypeScript configuration
├── components.json               # shadcn/ui configuration
├── docs/
│   └── zitadel-setup.md          # Zitadel configuration guide
├── src/
│   ├── app/
│   │   ├── globals.css           # Global styles with CSS variables
│   │   ├── layout.tsx            # Root layout with providers
│   │   ├── login/
│   │   │   └── page.tsx          # Login page
│   │   ├── (protected)/
│   │   │   ├── layout.tsx        # Protected routes layout
│   │   │   └── page.tsx          # Dashboard placeholder
│   │   └── api/
│   │       └── auth/
│   │           └── [...nextauth]/
│   │               └── route.ts  # NextAuth API routes
│   ├── components/
│   │   ├── layout/
│   │   │   ├── header.tsx        # App header
│   │   │   ├── nav.tsx           # Navigation (placeholder)
│   │   │   └── user-menu.tsx     # User dropdown menu
│   │   └── ui/
│   │       ├── button.tsx        # shadcn/ui button
│   │       ├── card.tsx          # shadcn/ui card
│   │       ├── dropdown-menu.tsx # shadcn/ui dropdown
│   │       ├── avatar.tsx        # shadcn/ui avatar
│   │       ├── separator.tsx     # shadcn/ui separator
│   │       └── role-badge.tsx    # Custom role indicator
│   ├── lib/
│   │   ├── auth.ts               # NextAuth configuration
│   │   ├── auth-utils.ts         # Auth helper functions
│   │   └── utils.ts              # shadcn/ui utilities (cn function)
│   └── types/
│       └── next-auth.d.ts        # NextAuth type extensions
└── public/
    └── favicon.ico               # App favicon
```

---

## Tests to Write

### Unit Tests (Vitest)

**File**: `src/lib/__tests__/auth-utils.test.ts`

```typescript
describe('auth-utils', () => {
  describe('isAdmin', () => {
    it('returns true for admin role')
    it('returns false for user role')
    it('returns false for null session')
  })

  describe('requireAuth', () => {
    it('does not throw for valid session')
    it('throws for null session')
  })

  describe('requireAdmin', () => {
    it('does not throw for admin session')
    it('throws for user session')
    it('throws for null session')
  })
})
```

### Component Tests (Vitest + React Testing Library)

**File**: `src/components/layout/__tests__/user-menu.test.tsx`

```typescript
describe('UserMenu', () => {
  it('displays user name')
  it('displays user email')
  it('shows Admin badge for admin users')
  it('shows User badge for regular users')
  it('calls signOut when logout clicked')
})
```

**File**: `src/components/ui/__tests__/role-badge.test.tsx`

```typescript
describe('RoleBadge', () => {
  it('renders Admin with correct styling')
  it('renders User with correct styling')
})
```

### Integration Tests (Vitest)

**File**: `src/app/api/auth/__tests__/auth.test.ts`

```typescript
describe('Auth API', () => {
  it('returns providers at /api/auth/providers')
  it('handles callback correctly')
  it('clears session on signout')
})
```

### E2E Tests (Playwright) - Deferred to Phase 12

E2E auth tests require mocking Zitadel, which adds complexity. Document the test cases but implement in Phase 12:

```typescript
// tests/e2e/auth.spec.ts (placeholder)
describe('Authentication', () => {
  it('redirects to login when not authenticated')
  it('shows user info after login')
  it('can sign out')
  it('preserves return URL after login')
})
```

---

## Testing Setup

**Dependencies to Add**:

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

**Files to Create**:

`vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

`src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

**Scripts to Add** (package.json):

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## Acceptance Checklist

Before marking Phase 1 complete:

- [ ] `npm run dev` starts successfully
- [ ] `npm run build` completes without errors
- [ ] `npm run lint` passes
- [ ] `npm run format:check` passes
- [ ] `npm run test:run` all tests pass
- [ ] Visiting `/` while logged out redirects to `/login`
- [ ] Clicking "Sign in" redirects to Zitadel
- [ ] After Zitadel login, user sees dashboard with their name
- [ ] User role (User/Admin) displays correctly
- [ ] Clicking "Sign out" logs user out and redirects to `/login`
- [ ] Forest green primary color (#2c5530) applied throughout
- [ ] Components are keyboard navigable

---

## External Dependencies

| Dependency            | Action Required      | Owner         |
| --------------------- | -------------------- | ------------- |
| Zitadel application   | Create and configure | User (manual) |
| Environment variables | Set in `.env.local`  | User (manual) |

---

## Risk Mitigation

| Risk                                   | Mitigation                                                                |
| -------------------------------------- | ------------------------------------------------------------------------- |
| Zitadel token claims structure unknown | Test with real Zitadel instance early; log claims to understand structure |
| NextAuth v5 is in beta                 | Pin to specific version; monitor for breaking changes                     |
| Role extraction fails                  | Provide clear error messages; log claims for debugging                    |

---

## Estimated Effort

| Task                          | Complexity |
| ----------------------------- | ---------- |
| 1.1 Initialize Next.js        | Low        |
| 1.2 Configure Tailwind/shadcn | Low        |
| 1.3 ESLint/Prettier           | Low        |
| 1.4 Git settings              | Low        |
| 1.5 NextAuth setup            | Medium     |
| 1.6 Zitadel setup (external)  | Medium     |
| 1.7 Role-based access         | Medium     |
| 1.8 Basic layout              | Low        |
| 1.9 Protected routes          | Low        |
| 1.10 Login/logout flow        | Low        |
| Tests                         | Medium     |

---

## Next Phase

After Phase 1 is complete, Phase 2 (Database & Basic Report CRUD) can begin. Phase 2 depends on:

- Working authentication (this phase)
- User session with ID and role (this phase)
