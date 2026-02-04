import type { PlacesAutocompleteResponse, PlacePrediction } from './types'

function getApiKey(): string {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY environment variable is not set')
  }
  return apiKey
}

export interface AutocompleteResult {
  predictions: PlacePrediction[]
  status: 'OK' | 'ZERO_RESULTS' | 'ERROR'
  errorMessage?: string
}

export async function getPlaceAutocomplete(input: string, sessionToken?: string): Promise<AutocompleteResult> {
  if (!input || input.trim().length < 3) {
    return {
      predictions: [],
      status: 'ZERO_RESULTS',
    }
  }

  const apiKey = getApiKey()

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
  url.searchParams.set('input', input)
  url.searchParams.set('types', 'address')
  url.searchParams.set('components', 'country:us') // Restrict to US addresses
  url.searchParams.set('key', apiKey)

  if (sessionToken) {
    url.searchParams.set('sessiontoken', sessionToken)
  }

  try {
    const response = await fetch(url.toString())

    if (!response.ok) {
      return {
        predictions: [],
        status: 'ERROR',
        errorMessage: `HTTP error: ${response.status}`,
      }
    }

    const data: PlacesAutocompleteResponse = await response.json()

    if (data.status === 'ZERO_RESULTS') {
      return {
        predictions: [],
        status: 'ZERO_RESULTS',
      }
    }

    if (data.status !== 'OK') {
      return {
        predictions: [],
        status: 'ERROR',
        errorMessage: data.error_message || `API error: ${data.status}`,
      }
    }

    return {
      predictions: data.predictions,
      status: 'OK',
    }
  } catch (error) {
    console.error('Places Autocomplete API error:', error)
    return {
      predictions: [],
      status: 'ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
