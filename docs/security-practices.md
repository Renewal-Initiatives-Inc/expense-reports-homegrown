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
