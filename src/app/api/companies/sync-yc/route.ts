import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { syncYCCompanies, getYCSyncStatus } from '@/services/yc-companies'

export async function POST() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Optional: Check for admin role
  // if (session.user.role !== 'ADMIN') {
  //   return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  // }

  try {
    const result = await syncYCCompanies()

    if (!result.success) {
      return NextResponse.json(
        { error: 'Sync failed', errors: result.errors },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'YC companies sync completed',
      companiesProcessed: result.companiesProcessed,
      companiesCreated: result.companiesCreated,
      companiesUpdated: result.companiesUpdated,
      errors: result.errors.length > 0 ? result.errors.slice(0, 10) : undefined,
    })
  } catch (error) {
    console.error('YC sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync YC companies' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const status = await getYCSyncStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error('YC sync status error:', error)
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    )
  }
}
