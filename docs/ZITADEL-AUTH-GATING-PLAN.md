# Zitadel Auth Gating — Plan

**Status:** Implementation Complete — Awaiting Verification
**Last Updated:** 2026-02-12
**Author:** Jeff + Claude
**Traces to:** Auth audit across all Renewal Initiatives apps

> **Protocol**: This section is auto-updated before session end. Start new sessions with: `@docs/ZITADEL-AUTH-GATING-PLAN.md Continue.`

---

## 1. Problem Statement

Three apps (proposal-rodeo, renewal-timesheets, internal-app-registry-auth) allow any Zitadel-authenticated user to log in regardless of role. Access should be denied at login unless the user has `admin` or the app-specific role.

---

## 2. Discovery

### Audit Findings

| App | Project Dir | Auth Pattern | signIn Gate? | Current Behavior |
|-----|------------|-------------|-------------|-----------------|
| proposal-rodeo | `/Users/jefftakle/Desktop/Claude/proposal-rodeo` | NextAuth v5 + Zitadel provider | None | Anyone logs in, roles stored but not enforced |
| renewal-timesheets | `/Users/jefftakle/Desktop/Claude/renewal-timesheets` | Express + direct JWT/JWKS | Employee DB record only | DB-gated, not role-gated; employee record is legacy |
| internal-app-registry-auth | `/Users/jefftakle/Desktop/Claude/internal-app-registry-auth/app-portal` | NextAuth v5 + Zitadel provider | None | Anyone logs in, sees filtered app grid |

### Role Requirements

| App | Required Zitadel Roles (OR logic) | App Role Value |
|-----|----------------------------------|----------------|
| proposal-rodeo | `admin` OR `app:proposal-rodeo` | `admin` / `user` |
| renewal-timesheets | `admin` OR `app:renewal-timesheets` | `admin` (supervisor) / `user` |
| internal-app-registry-auth | `admin` OR `app:app-portal` | `admin` / `user` |

### Key Context

- **expense-reports-homegrown** already has the correct pattern (fixed this session) — use as reference
- **renewal-timesheets** has a legacy employee-record gate that should be removed; Zitadel is now the single source of truth for user provisioning
- No employee creation API exists in renewal-timesheets (only seed scripts), but the employee record requirement in `requireAuth` middleware is still blocking users who exist in Zitadel but not in the DB

---

## 3. Design Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| D1 | Gate access in `signIn` callback (NextAuth apps) or early in `requireAuth` middleware (Express app) | Deny at the earliest possible point — before session/JWT creation |
| D2 | Check `admin` OR `app:<slug>` — no other role grants access | Consistent pattern across all apps |
| D3 | Remove employee-record requirement from renewal-timesheets auth | Zitadel is now the source of truth; employee records are managed downstream |
| D4 | Each fix is made within its own project directory only | No cross-project imports or shared code — each app is self-contained |
| D5 | Pattern: `return false` from signIn callback (NextAuth) or `403` response (Express) on denial | Consistent UX — user sees auth error page |

---

## 4. Requirements

### P0: Must Have

- REQ-01: proposal-rodeo denies login unless user has `admin` or `app:proposal-rodeo` role
- REQ-02: renewal-timesheets denies access unless user has `admin` or `app:renewal-timesheets` role
- REQ-03: internal-app-registry-auth denies login unless user has `admin` or `app:app-portal` role
- REQ-04: renewal-timesheets removes legacy employee-record gate from auth middleware

### P1: Nice to Have

- REQ-05: Clear error messaging when login is denied (not a generic "server error")

### P2: Future

- REQ-06: Centralized auth policy library shared across apps (not in scope now)

---

## 5. Data Model

No schema changes required. All gating is based on Zitadel token claims.

---

## 6. Implementation Plan

### Phase 1: proposal-rodeo — Add signIn Gate

| Task | Status | Notes |
|------|--------|-------|
| Add `signIn` callback to `src/lib/auth.ts` | ✅ | Check for `admin` or `app:proposal-rodeo` in `urn:zitadel:iam:org:project:roles` claim. Return `false` to deny. |
| Verify roles scope is requested | ✅ | Currently requests `urn:zitadel:iam:org:project:roles` — confirmed correct |

**File:** `/Users/jefftakle/Desktop/Claude/proposal-rodeo/src/lib/auth.ts`

**Change:** Add `signIn` callback inside `callbacks: { ... }`:
```typescript
async signIn({ profile }) {
  const rolesClaim = profile?.['urn:zitadel:iam:org:project:roles'] as
    | Record<string, unknown>
    | undefined;
  const roles = rolesClaim ? Object.keys(rolesClaim) : [];
  if (!roles.includes('admin') && !roles.includes('app:proposal-rodeo')) {
    return false;
  }
  return true;
},
```

---

### Phase 2: internal-app-registry-auth — Add signIn Gate

| Task | Status | Notes |
|------|--------|-------|
| Add `signIn` callback to `src/lib/auth.ts` | ✅ | Check for `admin` or `app:app-portal`. Return `false` to deny. |
| Verify roles scope is requested | ✅ | Currently requests `urn:zitadel:iam:org:projects:roles` (plural) — confirmed correct |

**File:** `/Users/jefftakle/Desktop/Claude/internal-app-registry-auth/app-portal/src/lib/auth.ts`

**Change:** Add `signIn` callback in the NextAuth config `callbacks`:
```typescript
signIn: async ({ profile }) => {
  const roles = extractRoles(profile as Record<string, unknown>);
  if (!roles.includes('admin') && !roles.includes('app:app-portal')) {
    return false;
  }
  return true;
},
```

Note: This app already has `extractRoles()` helper — reuse it.

---

### Phase 3: renewal-timesheets — Replace Employee Gate with Zitadel Role Gate

| Task | Status | Notes |
|------|--------|-------|
| Add Zitadel role check to `requireAuth` middleware | ✅ | Check for `admin` or `app:renewal-timesheets` in token roles. Return 403 if missing. |
| Remove employee-record gate from `requireAuth` | ✅ | Employee lookup kept as non-blocking best-effort; 403 gate and active-status block removed |
| Remove employee active-status check from `requireAuth` | ✅ | This was part of the legacy employee gate |
| Verify roles claim is being parsed | ✅ | Currently extracts from `urn:zitadel:iam:org:project:roles` — confirmed correct |

**File:** `/Users/jefftakle/Desktop/Claude/renewal-timesheets/packages/backend/src/middleware/auth.middleware.ts`

**Change:** In `requireAuth()`, after JWT verification and role extraction, add:
```typescript
// Deny access unless user has required Zitadel role
if (!isAdmin && !roles.includes('app:renewal-timesheets')) {
  res.status(403).json({
    error: 'Forbidden',
    message: 'You do not have access to this application.',
  });
  return;
}
```

Then remove the employee-record gate:
```typescript
// DELETE: const employee = await getEmployeeByZitadelId(...)
// DELETE: if (!employee) { res.status(403)... }
// DELETE: if (employee.status !== 'active') { res.status(401)... }
```

---

## 7. Verification

| Test | App | How |
|------|-----|-----|
| User with `admin` role can log in | All 3 | Log in with admin Zitadel account |
| User with app-specific role can log in | All 3 | Assign `app:<slug>` role to test user, log in |
| User with NO matching role is denied | All 3 | Log in with Zitadel account that has no relevant role |
| User with wrong app role is denied | All 3 | E.g., user with `app:proposal-rodeo` tries renewal-timesheets |
| renewal-timesheets works without employee record | renewal-timesheets | New Zitadel user with `app:renewal-timesheets` role, no DB employee record |

---

## 8. Session Progress

### Session 1: 2026-02-12 (Discovery + expense-reports fix)

**Completed:**
- [x] Fixed expense-reports-homegrown auth (AUTH_SECRET, Zitadel env vars, signIn gate)
- [x] Audited all 3 apps for auth gating
- [x] Created plan document

### Session 2: 2026-02-12 (Implementation)

**Completed:**
- [x] Phase 1: Added `signIn` gate to proposal-rodeo — checks `admin` or `app:proposal-rodeo`
- [x] Phase 2: Added `signIn` gate to internal-app-registry-auth — checks `admin` or `app:app-portal` (reuses existing `extractRoles()`)
- [x] Phase 3: Replaced employee-record gate in renewal-timesheets with Zitadel role check — checks `admin` or `app:renewal-timesheets`; employee lookup kept as non-blocking for downstream use

**Next Steps:**
- [ ] Verify all 4 apps with test logins
