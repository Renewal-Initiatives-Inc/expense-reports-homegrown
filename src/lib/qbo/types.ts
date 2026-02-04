/**
 * Type definitions for QuickBooks Online API integration.
 */

// OAuth token response from QBO
export interface QboTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number // seconds
  x_refresh_token_expires_in: number
  realmId: string
}

// QBO Account (Chart of Accounts entry)
export interface QboAccount {
  Id: string
  Name: string
  AccountType: string
  AccountSubType: string
  Active: boolean
  FullyQualifiedName: string
}

// QBO Class (used for Projects)
export interface QboClass {
  Id: string
  Name: string
  Active: boolean
  FullyQualifiedName: string
}

// Normalized category for app use
export interface QboCategory {
  id: string
  name: string
  type: string
  subType: string
  fullyQualifiedName: string
}

// Normalized project for app use
export interface QboProject {
  id: string
  name: string
  fullyQualifiedName: string
}

// QBO connection status
export interface QboStatus {
  connected: boolean
  realmId: string | null
  tokenExpiresAt: Date | null
  cacheStatus: {
    categories: { cached: boolean; expiresAt: Date | null }
    projects: { cached: boolean; expiresAt: Date | null }
  }
}
