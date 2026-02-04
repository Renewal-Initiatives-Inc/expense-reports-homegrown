import { auth } from '@/lib/auth'
import { BlobUploadError, uploadReceipt } from '@/lib/blob'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const result = await uploadReceipt(file)

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof BlobUploadError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Failed to upload receipt:', error)
    return NextResponse.json({ error: 'Failed to upload receipt' }, { status: 500 })
  }
}
