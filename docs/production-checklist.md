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

---

## Intuit App Assessment Tips

When completing the Intuit app assessment questionnaire:

### Data Usage Questions
- Explain that you access Chart of Accounts (expense accounts) and Classes
- Mention that you create Bills for approved expense reports
- Clarify that you do NOT access bank accounts, customers, or payroll data

### Security Questions
- OAuth tokens are encrypted with AES-256 before storage
- Tokens are stored in encrypted PostgreSQL database
- HTTPS enforced for all connections
- Role-based access control (only admins can connect QBO)

### Support Questions
- Provide admin contact email
- Describe the internal nature of the application
- Mention user base is limited to organization employees

### Technical Questions
- OAuth 2.0 with PKCE is used
- Automatic token refresh before expiration
- Graceful degradation when QBO unavailable
