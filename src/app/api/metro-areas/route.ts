import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { METRO_AREAS } from '@/lib/metro-areas'

export async function GET() {
  try {
    const metroResults = await Promise.all(
      METRO_AREAS.map(async (metro) => {
        // Build OR conditions: match city names or state fallback
        const conditions: Record<string, unknown>[] = metro.cities.map((city) => ({
          city: { contains: city },
        }))

        if (metro.stateFallback) {
          conditions.push({
            state: metro.stateFallback,
            city: null,
          })
        }

        const count = await prisma.company.count({
          where: {
            archivedAt: null,
            OR: conditions,
          },
        })

        return {
          id: metro.id,
          label: metro.label,
          count,
        }
      })
    )

    // Only return metros with at least 1 company, sorted by count descending
    const filtered = metroResults
      .filter((m) => m.count > 0)
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({ metros: filtered })
  } catch (error) {
    console.error('Error fetching metro areas:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metro areas' },
      { status: 500 }
    )
  }
}
