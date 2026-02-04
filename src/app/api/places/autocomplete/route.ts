import { auth } from '@/lib/auth'
import { getPlaceAutocomplete } from '@/lib/google-maps/places'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const input = searchParams.get('input')
    const sessionToken = searchParams.get('sessionToken')

    if (!input) {
      return NextResponse.json({ error: 'Input parameter is required' }, { status: 400 })
    }

    const result = await getPlaceAutocomplete(input, sessionToken || undefined)

    if (result.status === 'ERROR') {
      return NextResponse.json({ error: result.errorMessage || 'Failed to fetch predictions' }, { status: 500 })
    }

    return NextResponse.json({
      predictions: result.predictions.map((p) => ({
        placeId: p.place_id,
        description: p.description,
        mainText: p.structured_formatting.main_text,
        secondaryText: p.structured_formatting.secondary_text,
      })),
    })
  } catch (error) {
    console.error('Failed to fetch place predictions:', error)
    return NextResponse.json({ error: 'Failed to fetch place predictions' }, { status: 500 })
  }
}
