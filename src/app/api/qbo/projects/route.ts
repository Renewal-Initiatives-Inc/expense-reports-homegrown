/**
 * Projects API endpoint.
 * Returns projects from QBO if connected, otherwise hardcoded fallback.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { fetchProjects } from '@/lib/qbo/service'
import { getCachedData } from '@/lib/db/queries/qbo-cache'
import { isQboConnected } from '@/lib/db/queries/qbo-tokens'
import { EXPENSE_PROJECTS } from '@/lib/categories'
import type { QboProject } from '@/lib/qbo/types'

export async function GET() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const connected = await isQboConnected()

  if (!connected) {
    return NextResponse.json({
      projects: EXPENSE_PROJECTS,
      source: 'hardcoded',
    })
  }

  try {
    const projects = await fetchProjects()
    return NextResponse.json({
      projects,
      source: 'qbo',
    })
  } catch {
    const cached = await getCachedData<QboProject[]>('projects')
    if (cached) {
      return NextResponse.json({
        projects: cached,
        source: 'cache',
        warning: 'Using cached data due to QBO error',
      })
    }

    return NextResponse.json({
      projects: EXPENSE_PROJECTS,
      source: 'hardcoded',
      warning: 'QBO unavailable, using default projects',
    })
  }
}
