import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCompanyContacts, getCompanyContactCount } from '@/services/enrichment'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: companyId } = await params
    const { searchParams } = new URL(request.url)

    const department = searchParams.get('department') || undefined
    const seniority = searchParams.get('seniority') || undefined
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 50
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!)
      : 0

    const [contacts, total] = await Promise.all([
      getCompanyContacts(companyId, { department, seniority, limit, offset }),
      getCompanyContactCount(companyId),
    ])

    return NextResponse.json({
      contacts,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Get contacts error:', error)
    return NextResponse.json(
      { error: 'Failed to get contacts' },
      { status: 500 }
    )
  }
}

// POST /api/companies/[id]/contacts - Add a new contact manually
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: companyId } = await params
    const body = await request.json()
    const { name, email, linkedinUrl, title, department } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Validate LinkedIn URL format if provided
    if (linkedinUrl && !linkedinUrl.match(/^https?:\/\/(www\.)?linkedin\.com\/(in|pub)\/[\w-]+\/?$/i)) {
      return NextResponse.json(
        { error: 'Invalid LinkedIn URL format' },
        { status: 400 }
      )
    }

    // Create the contact
    const contact = await prisma.person.create({
      data: {
        companyId,
        name,
        email: email || null,
        linkedinUrl: linkedinUrl || null,
        title: title || null,
        department: department?.toLowerCase() || null,
        source: 'MANUAL',
        emailStatus: email ? 'UNVERIFIED' : 'UNKNOWN',
        isVerified: false,
      },
    })

    return NextResponse.json({ contact }, { status: 201 })
  } catch (error) {
    console.error('Create contact error:', error)
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    )
  }
}
