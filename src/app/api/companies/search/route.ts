import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''

  if (q.length < 2) {
    return NextResponse.json({ companies: [] })
  }

  const companies = await prisma.company.findMany({
    where: {
      archivedAt: null,
      name: { contains: q },
    },
    select: { id: true, name: true, domain: true },
    orderBy: { name: 'asc' },
    take: 8,
  })

  return NextResponse.json({ companies })
}
