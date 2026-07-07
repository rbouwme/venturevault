import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    const coldEmails = await prisma.coldEmail.findMany({
      where: {
        userId: session.user.id,
        ...(companyId ? { companyId } : {}),
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            domain: true,
            oneLiner: true,
            city: true,
            state: true,
            country: true,
            tags: true,
            ycBatch: true,
            ycUrl: true,
            _count: { select: { people: { where: { archivedAt: null } } } },
          },
        },
      },
      orderBy: { sentAt: 'desc' },
    })

    return NextResponse.json(coldEmails)
  } catch (error) {
    console.error('Error fetching cold emails:', error)
    return NextResponse.json({ error: 'Failed to fetch cold emails' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { companyId, emailAddress, notes, sentAt } = await request.json()

    if (!companyId || !emailAddress) {
      return NextResponse.json(
        { error: 'Company ID and email address are required' },
        { status: 400 }
      )
    }

    const coldEmail = await prisma.coldEmail.create({
      data: {
        userId: session.user.id,
        companyId,
        emailAddress,
        notes: notes || null,
        sentAt: sentAt ? new Date(sentAt) : new Date(),
      },
    })

    return NextResponse.json(coldEmail, { status: 201 })
  } catch (error) {
    console.error('Error creating cold email:', error)
    return NextResponse.json({ error: 'Failed to log cold email' }, { status: 500 })
  }
}
