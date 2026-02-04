// Google Maps Distance Matrix API types

export type DistanceMatrixStatus = 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS' | 'MAX_ROUTE_LENGTH_EXCEEDED' | 'INVALID_REQUEST' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'UNKNOWN_ERROR'

export type ElementStatus = 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS'

export interface DistanceMatrixElement {
  status: ElementStatus
  duration?: {
    text: string
    value: number // seconds
  }
  distance?: {
    text: string
    value: number // meters
  }
}

export interface DistanceMatrixRow {
  elements: DistanceMatrixElement[]
}

export interface DistanceMatrixResponse {
  status: DistanceMatrixStatus
  origin_addresses: string[]
  destination_addresses: string[]
  rows: DistanceMatrixRow[]
  error_message?: string
}

export interface DistanceResult {
  distanceMeters: number
  distanceMiles: number
  durationSeconds: number
  originFormatted: string
  destinationFormatted: string
  status: 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS' | 'ERROR'
  errorMessage?: string
}

// Google Places Autocomplete API types

export interface PlacePrediction {
  place_id: string
  description: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
  types: string[]
}

export interface PlacesAutocompleteResponse {
  status: 'OK' | 'ZERO_RESULTS' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'INVALID_REQUEST'
  predictions: PlacePrediction[]
  error_message?: string
}
