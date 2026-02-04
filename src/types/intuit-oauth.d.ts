/**
 * Type declarations for intuit-oauth module.
 */

declare module 'intuit-oauth' {
  interface OAuthClientConfig {
    clientId: string
    clientSecret: string
    environment: 'sandbox' | 'production'
    redirectUri: string
  }

  interface TokenData {
    access_token?: string
    refresh_token?: string
    realmId?: string
  }

  interface AuthorizeParams {
    scope: string[]
    state?: string
  }

  interface ApiCallParams {
    url: string
    method?: string
    body?: unknown
  }

  interface AuthResponse {
    getJson(): unknown
  }

  class OAuthClient {
    constructor(config: OAuthClientConfig)

    static scopes: {
      Accounting: string
      Payment: string
      Payroll: string
      TimeTracking: string
      Benefits: string
      Profile: string
      Email: string
      Phone: string
      Address: string
      OpenId: string
    }

    authorizeUri(params: AuthorizeParams): string
    createToken(url: string): Promise<AuthResponse>
    refresh(): Promise<AuthResponse>
    setToken(token: TokenData): void
    makeApiCall(params: ApiCallParams): Promise<AuthResponse>
  }

  export default OAuthClient
}
