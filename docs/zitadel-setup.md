# Zitadel Application Setup Guide

This guide walks through setting up the expense-reports-homegrown application in Zitadel.

## Prerequisites

- Access to Zitadel admin console
- Existing Renewal Initiatives project in Zitadel

## Step 1: Create the Application

1. Log into Zitadel admin console
2. Navigate to **Projects** → **Renewal Initiatives** (or your project)
3. Click **New Application**
4. Configure:
   - **Name**: `expense-reports-homegrown`
   - **Type**: Web Application
   - **Authentication Method**: Code (PKCE recommended for security)

## Step 2: Configure Redirect URIs

Add the following redirect URIs:

### Development

- `http://localhost:3000/api/auth/callback/zitadel`

### Production

- `https://expenses.renewalinitiatives.org/api/auth/callback/zitadel`

### Post-Logout URIs (optional)

- `http://localhost:3000`
- `https://[your-production-domain]`

## Step 3: Create Application Roles

1. In the application settings, go to **Roles**
2. Create the following roles:

| Role Key                        | Display Name         | Description                                          |
| ------------------------------- | -------------------- | ---------------------------------------------------- |
| `app:expense-reports-homegrown` | Expense Reports User | Basic access to expense reports                      |
| `admin`                         | Administrator        | Can approve/reject reports and access admin settings |

## Step 4: Assign Roles to Users

1. Go to **Users** in the Zitadel console
2. Select a user
3. Go to **Authorizations**
4. Add authorization for the expense-reports-homegrown application
5. Assign appropriate roles:
   - Regular users: `app:expense-reports-homegrown`
   - Administrators: `app:expense-reports-homegrown` + `admin`

## Step 5: Retrieve Credentials

From the application settings, note:

1. **Client ID** - Found in application overview
2. **Client Secret** - Generate if using confidential client
3. **Issuer URL** - Your Zitadel instance URL (e.g., `https://your-instance.zitadel.cloud`)

## Step 6: Configure Environment Variables

Create `.env.local` in the project root:

```bash
# Generate a secret: openssl rand -base64 32
AUTH_SECRET=your-generated-secret

# Zitadel Configuration
AUTH_ZITADEL_ISSUER=https://your-instance.zitadel.cloud
AUTH_ZITADEL_CLIENT_ID=your-client-id
AUTH_ZITADEL_CLIENT_SECRET=your-client-secret

# Required for local development
NEXTAUTH_URL=http://localhost:3000
```

## Step 7: Verify Configuration

1. Start the development server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. You should be redirected to the login page
4. Click "Sign in with Zitadel"
5. Authenticate with Zitadel
6. Verify you're redirected back to the app with your session

## Troubleshooting

### "Invalid redirect_uri" Error

- Verify the redirect URI exactly matches what's configured in Zitadel
- Check for trailing slashes
- Ensure protocol matches (http vs https)

### Role Not Appearing in Session

- Verify the user has the role assigned in Zitadel
- Check that the scope includes project role claims
- Look at the raw token to see what claims are being sent

### Session Not Persisting

- Verify AUTH_SECRET is set
- Check browser cookies are enabled
- Verify NEXTAUTH_URL matches your development URL

## Token Claims Structure

Zitadel sends roles in the `urn:zitadel:iam:org:project:roles` claim:

```json
{
  "urn:zitadel:iam:org:project:roles": {
    "app:expense-reports-homegrown": {
      "org-id-123": "user"
    },
    "admin": {
      "org-id-123": "admin"
    }
  }
}
```

The auth configuration extracts these roles and maps them to the simplified `user` or `admin` role used in the application.
