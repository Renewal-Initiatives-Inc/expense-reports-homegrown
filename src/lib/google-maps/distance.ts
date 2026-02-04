import type { DistanceMatrixResponse, DistanceResult } from './types'

const METERS_TO_MILES = 0.000621371

function getApiKey(): string {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY environment variable is not set')
  }
  return apiKey
}

export async function calculateDistance(origin: string, destination: string, waypoints?: string[]): Promise<DistanceResult> {
  const apiKey = getApiKey()

  // If waypoints exist, we need to calculate the total distance through all points
  // The Distance Matrix API doesn't directly support waypoints like the Directions API
  // So we'll use Directions API for routes with waypoints
  if (waypoints && waypoints.length > 0) {
    return calculateDistanceWithWaypoints(origin, destination, waypoints, apiKey)
  }

  const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
  url.searchParams.set('origins', origin)
  url.searchParams.set('destinations', destination)
  url.searchParams.set('units', 'imperial')
  url.searchParams.set('mode', 'driving')
  url.searchParams.set('key', apiKey)

  try {
    const response = await fetch(url.toString())

    if (!response.ok) {
      return {
        distanceMeters: 0,
        distanceMiles: 0,
        durationSeconds: 0,
        originFormatted: origin,
        destinationFormatted: destination,
        status: 'ERROR',
        errorMessage: `HTTP error: ${response.status}`,
      }
    }

    const data: DistanceMatrixResponse = await response.json()

    if (data.status !== 'OK') {
      return {
        distanceMeters: 0,
        distanceMiles: 0,
        durationSeconds: 0,
        originFormatted: origin,
        destinationFormatted: destination,
        status: 'ERROR',
        errorMessage: data.error_message || `API error: ${data.status}`,
      }
    }

    const element = data.rows[0]?.elements[0]

    if (!element || element.status !== 'OK') {
      return {
        distanceMeters: 0,
        distanceMiles: 0,
        durationSeconds: 0,
        originFormatted: data.origin_addresses[0] || origin,
        destinationFormatted: data.destination_addresses[0] || destination,
        status: element?.status === 'NOT_FOUND' ? 'NOT_FOUND' : element?.status === 'ZERO_RESULTS' ? 'ZERO_RESULTS' : 'ERROR',
        errorMessage: element?.status !== 'OK' ? `Route element status: ${element?.status}` : undefined,
      }
    }

    const distanceMeters = element.distance?.value || 0
    const distanceMiles = Number((distanceMeters * METERS_TO_MILES).toFixed(2))

    return {
      distanceMeters,
      distanceMiles,
      durationSeconds: element.duration?.value || 0,
      originFormatted: data.origin_addresses[0] || origin,
      destinationFormatted: data.destination_addresses[0] || destination,
      status: 'OK',
    }
  } catch (error) {
    console.error('Distance Matrix API error:', error)
    return {
      distanceMeters: 0,
      distanceMiles: 0,
      durationSeconds: 0,
      originFormatted: origin,
      destinationFormatted: destination,
      status: 'ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

interface DirectionsResponse {
  status: string
  routes: Array<{
    legs: Array<{
      distance: { value: number; text: string }
      duration: { value: number; text: string }
      start_address: string
      end_address: string
    }>
  }>
  error_message?: string
}

async function calculateDistanceWithWaypoints(origin: string, destination: string, waypoints: string[], apiKey: string): Promise<DistanceResult> {
  const url = new URL('https://maps.googleapis.com/maps/api/directions/json')
  url.searchParams.set('origin', origin)
  url.searchParams.set('destination', destination)
  url.searchParams.set('waypoints', waypoints.join('|'))
  url.searchParams.set('mode', 'driving')
  url.searchParams.set('key', apiKey)

  try {
    const response = await fetch(url.toString())

    if (!response.ok) {
      return {
        distanceMeters: 0,
        distanceMiles: 0,
        durationSeconds: 0,
        originFormatted: origin,
        destinationFormatted: destination,
        status: 'ERROR',
        errorMessage: `HTTP error: ${response.status}`,
      }
    }

    const data: DirectionsResponse = await response.json()

    if (data.status !== 'OK') {
      return {
        distanceMeters: 0,
        distanceMiles: 0,
        durationSeconds: 0,
        originFormatted: origin,
        destinationFormatted: destination,
        status: data.status === 'NOT_FOUND' ? 'NOT_FOUND' : data.status === 'ZERO_RESULTS' ? 'ZERO_RESULTS' : 'ERROR',
        errorMessage: data.error_message || `API error: ${data.status}`,
      }
    }

    const route = data.routes[0]
    if (!route || route.legs.length === 0) {
      return {
        distanceMeters: 0,
        distanceMiles: 0,
        durationSeconds: 0,
        originFormatted: origin,
        destinationFormatted: destination,
        status: 'ZERO_RESULTS',
        errorMessage: 'No route found',
      }
    }

    // Sum up all legs
    let totalDistanceMeters = 0
    let totalDurationSeconds = 0

    for (const leg of route.legs) {
      totalDistanceMeters += leg.distance.value
      totalDurationSeconds += leg.duration.value
    }

    const firstLeg = route.legs[0]
    const lastLeg = route.legs[route.legs.length - 1]

    return {
      distanceMeters: totalDistanceMeters,
      distanceMiles: Number((totalDistanceMeters * METERS_TO_MILES).toFixed(2)),
      durationSeconds: totalDurationSeconds,
      originFormatted: firstLeg.start_address,
      destinationFormatted: lastLeg.end_address,
      status: 'OK',
    }
  } catch (error) {
    console.error('Directions API error:', error)
    return {
      distanceMeters: 0,
      distanceMiles: 0,
      durationSeconds: 0,
      originFormatted: origin,
      destinationFormatted: destination,
      status: 'ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
