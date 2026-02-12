import { NextResponse } from 'next/server'
import { confirmSnsSubscription, fetchEmailFromS3, parseSnsNotification, processInboundEmail, verifySnsMessage } from '@/lib/email'
import type { SnsMessageType } from '@/lib/email'

/**
 * POST /api/email/inbound
 *
 * Webhook handler for AWS SNS notifications triggered by SES inbound email.
 * Handles three SNS message types:
 * - SubscriptionConfirmation: confirms the SNS → webhook subscription
 * - Notification: processes an inbound email event (fetches from S3, logs metadata)
 * - UnsubscribeConfirmation: acknowledges unsubscription
 *
 * Security: All messages are cryptographically verified via SNS signature (D13).
 */
export async function POST(request: Request) {
  let message: Record<string, unknown>

  // 1. Parse the request body
  try {
    const body = await request.text()
    message = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // 2. Verify SNS message signature (D13)
  const isValid = await verifySnsMessage(message)
  if (!isValid) {
    console.error('[email/inbound] Invalid SNS signature — rejecting request')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const messageType = message.Type as SnsMessageType

  // 3. Handle SubscriptionConfirmation
  if (messageType === 'SubscriptionConfirmation') {
    const subscribeUrl = message.SubscribeURL as string
    if (!subscribeUrl) {
      console.error('[email/inbound] SubscriptionConfirmation missing SubscribeURL')
      return NextResponse.json({ error: 'Missing SubscribeURL' }, { status: 400 })
    }

    try {
      await confirmSnsSubscription(subscribeUrl)
      console.log('[email/inbound] SNS subscription confirmed')
      return NextResponse.json({ status: 'subscription_confirmed' })
    } catch (error) {
      console.error('[email/inbound] Failed to confirm SNS subscription:', error)
      return NextResponse.json({ error: 'Subscription confirmation failed' }, { status: 500 })
    }
  }

  // 4. Handle UnsubscribeConfirmation
  if (messageType === 'UnsubscribeConfirmation') {
    console.log('[email/inbound] SNS unsubscribe confirmation received')
    return NextResponse.json({ status: 'unsubscribe_confirmed' })
  }

  // 5. Handle Notification (email received)
  if (messageType === 'Notification') {
    // Parse SES notification from SNS message
    const sesNotification = parseSnsNotification(message)
    if (!sesNotification) {
      console.error('[email/inbound] Failed to parse SES notification from SNS message')
      return NextResponse.json({ error: 'Invalid SES notification' }, { status: 400 })
    }

    try {
      // Fetch raw email from S3
      const rawEmail = await fetchEmailFromS3(sesNotification.bucket, sesNotification.key)

      // Process the email pipeline: parse, verify sender, extract, create expense
      const result = await processInboundEmail(rawEmail, sesNotification.messageId)
      console.log('[email/inbound] Processing result:', result)

      return NextResponse.json({ status: result.status, messageId: sesNotification.messageId })
    } catch (error) {
      console.error('[email/inbound] Failed to process email:', error)
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
    }
  }

  // Unknown message type
  console.warn('[email/inbound] Unknown SNS message type:', messageType)
  return NextResponse.json({ error: 'Unknown message type' }, { status: 400 })
}
