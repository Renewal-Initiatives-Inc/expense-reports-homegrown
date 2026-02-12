import MessageValidator from 'sns-validator'

const validator = new MessageValidator()

/**
 * SNS message types the webhook handler must respond to.
 */
export type SnsMessageType = 'SubscriptionConfirmation' | 'Notification' | 'UnsubscribeConfirmation'

/**
 * Parsed SES notification from within an SNS message.
 * Contains the S3 bucket/key where the raw email is stored.
 */
export interface SesNotification {
  bucket: string
  key: string
  messageId: string
}

/**
 * Verify the cryptographic signature of an SNS message.
 * Uses the official sns-validator package to check message authenticity
 * against AWS-published signing certificates (D13).
 */
export async function verifySnsMessage(message: Record<string, unknown>): Promise<boolean> {
  return new Promise((resolve) => {
    validator.validate(message, (err) => {
      resolve(!err)
    })
  })
}

/**
 * Parse an SNS notification body to extract the SES email event info.
 * The SNS `Message` field contains a JSON string with the SES notification,
 * which includes the S3 bucket and key where the raw email was stored.
 *
 * Returns null if the message cannot be parsed.
 */
export function parseSnsNotification(snsMessage: Record<string, unknown>): SesNotification | null {
  try {
    const messageBody = typeof snsMessage.Message === 'string' ? JSON.parse(snsMessage.Message) : null

    if (!messageBody) {
      return null
    }

    // SES notification structure: mail.messageId, receipt.action.bucketName/objectKey
    const receipt = messageBody.receipt
    const mail = messageBody.mail

    if (!receipt?.action?.bucketName || !receipt?.action?.objectKey || !mail?.messageId) {
      return null
    }

    return {
      bucket: receipt.action.bucketName,
      key: receipt.action.objectKey,
      messageId: mail.messageId,
    }
  } catch {
    return null
  }
}

/**
 * Confirm an SNS subscription by fetching the SubscribeURL.
 * AWS requires this to activate the HTTPS endpoint subscription.
 */
export async function confirmSnsSubscription(subscribeUrl: string): Promise<void> {
  const response = await fetch(subscribeUrl)
  if (!response.ok) {
    throw new Error(`Failed to confirm SNS subscription: ${response.status}`)
  }
}
