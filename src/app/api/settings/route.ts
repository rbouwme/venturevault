import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateUserSettings } from '@/services/user'
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production'

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return `${iv.toString('hex')}:${encrypted}`
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, openaiKey, linkedinUrl } = await request.json()

    const updateData: { name?: string; openaiKeyEncrypted?: string; linkedinUrl?: string | null } = {}

    if (name !== undefined) {
      updateData.name = name
    }

    if (openaiKey) {
      updateData.openaiKeyEncrypted = encrypt(openaiKey)
    }

    if (linkedinUrl !== undefined) {
      // Validate LinkedIn URL format if provided
      if (linkedinUrl && !linkedinUrl.match(/^https?:\/\/(www\.)?linkedin\.com\/(in|pub)\/[\w-]+\/?$/i)) {
        return NextResponse.json({ error: 'Invalid LinkedIn URL format. Use format: https://linkedin.com/in/your-profile' }, { status: 400 })
      }
      updateData.linkedinUrl = linkedinUrl || null
    }

    const user = await updateUserSettings(session.user.id, updateData)
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      linkedinUrl: user.linkedinUrl,
    })
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
