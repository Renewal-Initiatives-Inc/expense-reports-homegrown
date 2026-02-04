import { auth } from '@/lib/auth'
import { getMileageRate, setMileageRate } from '@/lib/db/queries/settings'
import { mileageRateSchema } from '@/lib/validations/settings'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const mileageRate = await getMileageRate()
    return NextResponse.json(mileageRate)
  } catch (error) {
    console.error('Failed to fetch mileage rate:', error)
    return NextResponse.json({ error: 'Failed to fetch mileage rate' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can update the mileage rate
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const validationResult = mileageRateSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Validation failed', details: validationResult.error.flatten() }, { status: 422 })
    }

    const { rate, effectiveDate } = validationResult.data
    await setMileageRate(rate, effectiveDate, session.user.id)

    return NextResponse.json({ rate, effectiveDate })
  } catch (error) {
    console.error('Failed to update mileage rate:', error)
    return NextResponse.json({ error: 'Failed to update mileage rate' }, { status: 500 })
  }
}
