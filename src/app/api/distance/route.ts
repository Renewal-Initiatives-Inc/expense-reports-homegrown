import { auth } from '@/lib/auth'
import { calculateDistance } from '@/lib/google-maps/distance'
import { getMileageRate } from '@/lib/db/queries/settings'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const distanceRequestSchema = z.object({
  origin: z.string().min(1, 'Origin is required'),
  destination: z.string().min(1, 'Destination is required'),
  waypoints: z.array(z.string()).optional(),
})

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = distanceRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Validation failed', details: validationResult.error.flatten() }, { status: 422 })
    }

    const { origin, destination, waypoints } = validationResult.data

    // Calculate distance using Google Maps API
    const distanceResult = await calculateDistance(origin, destination, waypoints)

    if (distanceResult.status !== 'OK') {
      const statusMessages: Record<string, string> = {
        NOT_FOUND: 'One or more addresses could not be found. Please check the addresses and try again.',
        ZERO_RESULTS: 'No route could be found between the addresses.',
        ERROR: distanceResult.errorMessage || 'An error occurred while calculating distance.',
      }

      return NextResponse.json(
        {
          error: statusMessages[distanceResult.status] || 'Failed to calculate distance',
          status: distanceResult.status,
        },
        { status: 400 }
      )
    }

    // Get current IRS mileage rate
    const mileageRate = await getMileageRate()

    // Calculate amount
    const amount = Number((distanceResult.distanceMiles * mileageRate.rate).toFixed(2))

    return NextResponse.json({
      miles: distanceResult.distanceMiles,
      amount,
      rate: mileageRate.rate,
      effectiveDate: mileageRate.effectiveDate,
      durationSeconds: distanceResult.durationSeconds,
      formatted: {
        origin: distanceResult.originFormatted,
        destination: distanceResult.destinationFormatted,
      },
    })
  } catch (error) {
    console.error('Failed to calculate distance:', error)

    if (error instanceof Error && error.message.includes('GOOGLE_MAPS_API_KEY')) {
      return NextResponse.json({ error: 'Google Maps API is not configured' }, { status: 503 })
    }

    return NextResponse.json({ error: 'Failed to calculate distance' }, { status: 500 })
  }
}
