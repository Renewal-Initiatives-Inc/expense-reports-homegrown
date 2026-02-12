# AWS Email Pipeline Setup

> Step-by-step guide to configure AWS SES, S3, and SNS for the inbound email receipts feature.

## Prerequisites

- AWS account with access to SES, S3, SNS, and IAM
- DNS access to `expenses.renewalinitiatives.org` subdomain
- Vercel deployment URL for the webhook endpoint

---

## 1. Choose AWS Region

SES inbound email is only available in these regions:
- **us-east-1** (N. Virginia) — recommended
- **us-west-2** (Oregon)
- **eu-west-1** (Ireland)

All AWS resources (SES, S3 bucket, SNS topic) must be in the **same region**.

---

## 2. Create S3 Bucket

1. Go to **S3** → **Create bucket**
2. Bucket name: `renewal-expense-emails` (or similar)
3. Region: Same as SES region (e.g., `us-east-1`)
4. Leave defaults for everything else

### Bucket Policy

Add this bucket policy to allow SES to write emails:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSESPuts",
      "Effect": "Allow",
      "Principal": {
        "Service": "ses.amazonaws.com"
      },
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::renewal-expense-emails/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceAccount": "<YOUR_AWS_ACCOUNT_ID>"
        }
      }
    }
  ]
}
```

Replace `<YOUR_AWS_ACCOUNT_ID>` with your 12-digit AWS account ID.

### Lifecycle Rule (Optional)

Add a lifecycle rule to auto-delete objects after 30 days (raw emails are processed immediately and kept briefly for debugging):

1. Go to **Management** tab → **Create lifecycle rule**
2. Rule name: `delete-after-30-days`
3. Apply to all objects
4. Action: **Expire current versions** → 30 days

---

## 3. Verify Domain in SES

1. Go to **SES** → **Verified identities** → **Create identity**
2. Identity type: **Domain**
3. Domain: `expenses.renewalinitiatives.org`
4. Follow the DNS verification instructions (add CNAME records)
5. Wait for verification (usually a few minutes to a few hours)

---

## 4. Create SNS Topic

1. Go to **SNS** → **Topics** → **Create topic**
2. Type: **Standard**
3. Name: `expense-email-inbound`
4. Leave defaults → **Create topic**

Note the **Topic ARN** (e.g., `arn:aws:sns:us-east-1:123456789:expense-email-inbound`).

---

## 5. Create SES Receipt Rule

1. Go to **SES** → **Email receiving** → **Create rule set** (if none exists)
2. Activate the rule set
3. **Create rule** within the rule set:
   - **Recipients**: `receipts@expenses.renewalinitiatives.org`
   - **Actions** (in order):
     1. **Deliver to S3 bucket**: Select `renewal-expense-emails`
     2. **Publish to SNS topic**: Select `expense-email-inbound`, Encoding: UTF-8

---

## 6. Add SNS Subscription (Webhook)

1. Go to **SNS** → **Topics** → `expense-email-inbound` → **Create subscription**
2. Protocol: **HTTPS**
3. Endpoint: `https://<your-vercel-app>.vercel.app/api/email/inbound`
4. Click **Create subscription**

The subscription will be in **Pending confirmation** state. The webhook handler at `/api/email/inbound` automatically handles the `SubscriptionConfirmation` message from SNS.

> **Note**: The Vercel app must be deployed with the webhook route before creating the subscription. Deploy first, then create the subscription.

### Verify Subscription

After creating the subscription, check:
- SNS console should show status: **Confirmed**
- Vercel logs should show: `[email/inbound] SNS subscription confirmed`

---

## 7. Create IAM User

1. Go to **IAM** → **Users** → **Create user**
2. User name: `expense-email-pipeline`
3. Access type: **Programmatic access** (access key)

### IAM Policy

Attach an inline policy with these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadEmailsFromS3",
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::renewal-expense-emails/*"
    },
    {
      "Sid": "SendAutoReplyEmails",
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ses:FromAddress": "noreply@expenses.renewalinitiatives.org"
        }
      }
    }
  ]
}
```

### Generate Access Key

1. Go to the user → **Security credentials** → **Create access key**
2. Use case: **Application running outside AWS**
3. Save the **Access key ID** and **Secret access key**

---

## 8. Set DNS MX Record

Add an MX record for the subdomain pointing to SES:

| Host | Type | Priority | Value |
|------|------|----------|-------|
| `expenses.renewalinitiatives.org` | MX | 10 | `inbound-smtp.us-east-1.amazonaws.com` |

Adjust the value based on your SES region:
- us-east-1: `inbound-smtp.us-east-1.amazonaws.com`
- us-west-2: `inbound-smtp.us-west-2.amazonaws.com`
- eu-west-1: `inbound-smtp.eu-west-1.amazonaws.com`

### Verify DNS

Wait for propagation (can take up to 48 hours), then verify:

```bash
dig MX expenses.renewalinitiatives.org
```

Expected output should include the SES inbound endpoint.

---

## 9. Configure Environment Variables

Add these to your Vercel project and `.env.local`:

```env
AWS_ACCESS_KEY_ID=<from step 7>
AWS_SECRET_ACCESS_KEY=<from step 7>
AWS_SES_REGION=us-east-1
AWS_S3_EMAIL_BUCKET=renewal-expense-emails
AWS_SES_FROM_ADDRESS=noreply@expenses.renewalinitiatives.org
```

---

## 10. End-to-End Test

1. Deploy the app with the new environment variables
2. Forward a test email to `receipts@expenses.renewalinitiatives.org`
3. Check Vercel function logs for:
   ```
   [email/inbound] Email received: { messageId: '...', s3Location: 's3://...', sizeBytes: ... }
   ```
4. If no log appears:
   - Check SNS subscription is confirmed
   - Check SES receipt rule is active
   - Check MX record has propagated: `dig MX expenses.renewalinitiatives.org`
   - Check S3 bucket has the email object

---

## Cost Estimate

At 5-10 emails/month:

| Service | Cost |
|---------|------|
| SES inbound | Free (first 1,000/month) |
| SES outbound (auto-replies) | ~$0.001/email |
| S3 storage | < $0.01/month |
| SNS notifications | Free (first 1M/month) |
| **Total** | **< $0.01/month** |
