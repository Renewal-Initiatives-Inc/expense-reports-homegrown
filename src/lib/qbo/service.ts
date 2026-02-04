/**
 * High-level QBO service operations with automatic token management.
 * Provides functions for fetching categories, projects, and managing connection state.
 */

import { createOAuthClient, makeApiCall, refreshTokens } from './client'
import { getQboTokens, isTokenExpiringSoon, saveQboTokens } from '@/lib/db/queries/qbo-tokens'
import { getCachedData, getCacheStatus, setCachedData } from '@/lib/db/queries/qbo-cache'
import { logQboError, logQboApiCall, logOAuthEvent, startTimer } from '@/lib/monitoring'
import type { QboAccount, QboCategory, QboClass, QboProject, QboStatus } from './types'

const QBO_BASE_URL_SANDBOX = 'https://sandbox-quickbooks.api.intuit.com'
const QBO_BASE_URL_PRODUCTION = 'https://quickbooks.api.intuit.com'

function getBaseUrl(): string {
  return process.env.QBO_ENVIRONMENT === 'production' ? QBO_BASE_URL_PRODUCTION : QBO_BASE_URL_SANDBOX
}

async function getValidOAuthClient(): Promise<{
  client: ReturnType<typeof createOAuthClient>
  realmId: string
} | null> {
  console.log('getValidOAuthClient: Fetching tokens from database...')
  const tokens = await getQboTokens()
  if (!tokens) {
    console.log('getValidOAuthClient: No tokens found')
    return null
  }
  console.log('getValidOAuthClient: Tokens found, realmId:', tokens.realmId)
  console.log('getValidOAuthClient: Token expires at:', tokens.expiresAt)

  const client = createOAuthClient()

  // Check if token needs refresh
  const expiringSoon = await isTokenExpiringSoon()
  console.log('getValidOAuthClient: Token expiring soon?', expiringSoon)

  if (expiringSoon) {
    try {
      console.log('getValidOAuthClient: Refreshing token...')
      const newTokens = await refreshTokens(client, tokens.refreshToken)
      await saveQboTokens(
        {
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token,
          realmId: tokens.realmId,
          expiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
        },
        'system'
      )

      client.setToken({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        realmId: tokens.realmId,
      })
      logOAuthEvent('token_refresh', { realmId: tokens.realmId })
      console.log('getValidOAuthClient: Token refreshed successfully')
    } catch (error) {
      logOAuthEvent('token_refresh_error', { error: error instanceof Error ? error.message : String(error) })
      console.error('Failed to refresh QBO token:', error)
      return null
    }
  } else {
    console.log('getValidOAuthClient: Setting existing token on client...')
    console.log('getValidOAuthClient: Access token length:', tokens.accessToken?.length || 0)
    client.setToken({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      realmId: tokens.realmId,
    })
    console.log('getValidOAuthClient: Token set on client')
  }

  return { client, realmId: tokens.realmId }
}

export async function fetchCategories(): Promise<QboCategory[]> {
  // Check cache first
  const cached = await getCachedData<QboCategory[]>('categories')
  if (cached) return cached

  // Fetch from QBO
  const auth = await getValidOAuthClient()
  if (!auth) {
    throw new Error('QuickBooks is not connected')
  }

  const baseUrl = getBaseUrl()
  const query = encodeURIComponent("SELECT * FROM Account WHERE AccountType = 'Expense' AND Active = true")
  const endpoint = `${baseUrl}/v3/company/${auth.realmId}/query?query=${query}&minorversion=65`

  console.log('Fetching categories from:', endpoint)
  const stopTimer = startTimer()

  try {
    const response = await makeApiCall<{
      QueryResponse: { Account?: QboAccount[] }
    }>(auth.client, endpoint)

    const duration = stopTimer()
    logQboApiCall('categories', true, duration, { count: response.QueryResponse.Account?.length ?? 0 })
    console.log('Categories response:', JSON.stringify(response, null, 2))

    const categories: QboCategory[] = (response.QueryResponse.Account || []).map((account) => ({
      id: account.Id,
      name: account.Name,
      type: account.AccountType,
      subType: account.AccountSubType,
      fullyQualifiedName: account.FullyQualifiedName,
    }))

    // Cache the result
    await setCachedData('categories', categories)

    return categories
  } catch (error) {
    const duration = stopTimer()
    logQboApiCall('categories', false, duration)
    logQboError(error as Error, 'error', { action: 'fetchCategories' })
    console.error('Failed to fetch categories from QBO:', error)
    throw error
  }
}

export async function fetchProjects(): Promise<QboProject[]> {
  // Check cache first
  const cached = await getCachedData<QboProject[]>('projects')
  if (cached) return cached

  // Fetch from QBO (Classes in QBO = Projects)
  const auth = await getValidOAuthClient()
  if (!auth) {
    throw new Error('QuickBooks is not connected')
  }

  const baseUrl = getBaseUrl()
  const query = encodeURIComponent('SELECT * FROM Class WHERE Active = true')
  const endpoint = `${baseUrl}/v3/company/${auth.realmId}/query?query=${query}&minorversion=65`

  console.log('Fetching projects from:', endpoint)
  const stopTimer = startTimer()

  try {
    const response = await makeApiCall<{
      QueryResponse: { Class?: QboClass[] }
    }>(auth.client, endpoint)

    const duration = stopTimer()
    logQboApiCall('projects', true, duration, { count: response.QueryResponse.Class?.length ?? 0 })
    console.log('Projects response:', JSON.stringify(response, null, 2))

    const projects: QboProject[] = (response.QueryResponse.Class || []).map((cls) => ({
      id: cls.Id,
      name: cls.Name,
      fullyQualifiedName: cls.FullyQualifiedName,
    }))

    // Cache the result
    await setCachedData('projects', projects)

    return projects
  } catch (error) {
    const duration = stopTimer()
    logQboApiCall('projects', false, duration)
    logQboError(error as Error, 'error', { action: 'fetchProjects' })
    console.error('Failed to fetch projects from QBO:', error)
    throw error
  }
}

export async function getQboStatus(): Promise<QboStatus> {
  const tokens = await getQboTokens()
  const cacheStatus = await getCacheStatus()

  return {
    connected: tokens !== null,
    realmId: tokens?.realmId || null,
    tokenExpiresAt: tokens?.expiresAt || null,
    cacheStatus,
  }
}
