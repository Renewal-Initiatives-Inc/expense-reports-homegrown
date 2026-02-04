/**
 * QBO sync endpoint.
 * Forces refresh of categories and projects from QBO.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { fetchCategories, fetchProjects } from '@/lib/qbo/service'
import { invalidateAllCache } from '@/lib/db/queries/qbo-cache'
import { isQboConnected } from '@/lib/db/queries/qbo-tokens'

export async function POST() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const connected = await isQboConnected()
  if (!connected) {
    return NextResponse.json({ error: 'QuickBooks not connected' }, { status: 400 })
  }

  try {
    // Invalidate cache first
    await invalidateAllCache()

    // Fetch fresh data (will populate cache)
    const [categories, projects] = await Promise.all([fetchCategories(), fetchProjects()])

    return NextResponse.json({
      success: true,
      categories: categories.length,
      projects: projects.length,
    })
  } catch (error) {
    console.error('QBO sync failed:', error)
    return NextResponse.json({ error: 'Sync failed. Please check QBO connection.' }, { status: 500 })
  }
}
