/**
 * QuickBooks Online OAuth client wrapper.
 * Provides functions for OAuth flow and API calls.
 */

import OAuthClient from 'intuit-oauth'
import type { QboTokenResponse } from './types'

export function createOAuthClient(): OAuthClient {
  return new OAuthClient({
    clientId: process.env.QBO_CLIENT_ID!,
    clientSecret: process.env.QBO_CLIENT_SECRET!,
    environment: (process.env.QBO_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
    redirectUri: process.env.QBO_REDIRECT_URI!,
  })
}

export function getAuthorizationUrl(oauthClient: OAuthClient, state: string): string {
  return oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting],
    state,
  })
}

export async function exchangeCodeForTokens(oauthClient: OAuthClient, url: string): Promise<QboTokenResponse> {
  console.log('Exchanging code for tokens with URL:', url)
  try {
    const authResponse = await oauthClient.createToken(url)
    const json = authResponse.getJson()
    console.log('Token exchange successful')
    return json as QboTokenResponse
  } catch (error) {
    console.error('Token exchange error details:', error)
    throw error
  }
}

export async function refreshTokens(oauthClient: OAuthClient, refreshToken: string): Promise<QboTokenResponse> {
  oauthClient.setToken({ refresh_token: refreshToken })
  const authResponse = await oauthClient.refresh()
  return authResponse.getJson() as QboTokenResponse
}

export async function makeApiCall<T>(oauthClient: OAuthClient, endpoint: string): Promise<T> {
  console.log('Making QBO API call to:', endpoint)
  try {
    const response = await oauthClient.makeApiCall({ url: endpoint })
    // The response from makeApiCall has a different structure than createToken
    // It returns { json: data } or the response object has a body property
    // Type assertion needed because AuthResponse type doesn't include json property
    const apiResponse = response as unknown as { json?: unknown; body?: unknown }
    const data = apiResponse.json || apiResponse.body || response
    console.log('QBO API response type:', typeof data)
    return data as T
  } catch (error) {
    console.error('QBO API call failed:', error)
    throw error
  }
}

/**
 * Check if all required QBO environment variables are configured.
 * Logs warnings for missing variables.
 */
export function isQboConfigured(): boolean {
  const required = [
    'QBO_CLIENT_ID',
    'QBO_CLIENT_SECRET',
    'QBO_REDIRECT_URI',
    'QBO_ENCRYPTION_KEY',
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    console.warn(`[QBO] Not configured. Missing: ${missing.join(', ')}`)
    return false
  }

  return true
}

/**
 * Get the current QBO environment (sandbox or production).
 * Defaults to sandbox if not specified.
 */
export function getQboEnvironment(): 'sandbox' | 'production' {
  const env = process.env.QBO_ENVIRONMENT
  if (env === 'production') return 'production'
  return 'sandbox'
}

/**
 * Get the base API URL for the current QBO environment.
 */
export function getQboBaseUrl(): string {
  const environment = getQboEnvironment()
  return environment === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com'
}
