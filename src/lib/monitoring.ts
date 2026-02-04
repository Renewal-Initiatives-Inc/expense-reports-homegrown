/**
 * Error reporting and monitoring utilities.
 * Provides structured logging for QBO integration and other services.
 */

type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical'

interface ErrorContext {
  userId?: string
  action?: string
  [key: string]: unknown
}

/**
 * Log a QBO-related error with structured context.
 * In production, this could send to a monitoring service like Sentry.
 */
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
    stack:
      process.env.NODE_ENV === 'development' && error instanceof Error
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

/**
 * Log a QBO API call with timing information.
 */
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

/**
 * Log an OAuth-related event.
 */
export function logOAuthEvent(
  event: 'connect_start' | 'connect_success' | 'connect_error' | 'disconnect' | 'token_refresh' | 'token_refresh_error',
  context: ErrorContext = {}
): void {
  const severity: ErrorSeverity =
    event === 'connect_error' || event === 'token_refresh_error' ? 'error' : 'info'

  logQboError(`OAuth event: ${event}`, severity, { event, ...context })
}

/**
 * Create a timer for measuring API call duration.
 * Returns a function that stops the timer and returns elapsed milliseconds.
 */
export function startTimer(): () => number {
  const start = Date.now()
  return () => Date.now() - start
}
