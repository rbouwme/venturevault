import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import type { OutreachType } from '@prisma/client'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production'

function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

interface CompanyContext {
  name: string
  domain?: string | null
  latestFunding?: {
    roundType: string
    amount?: string
    investors: string[]
    date: string
  }
  isHiring: boolean
  jobCount: number
  contacts: { name: string; role?: string | null }[]
}

const SYSTEM_PROMPT = `You are an expert at writing professional outreach messages. Your messages are:
- Concise and value-focused
- Personalized based on the recipient's recent news/activity
- Professional but warm in tone
- Free of generic filler or clichés
- Focused on building genuine connections

You always reference specific details about the company (recent funding, growth signals) to show you've done your research.`

const TYPE_PROMPTS: Record<string, string> = {
  COLD_EMAIL: `Write a professional cold email to reach out to this company.
Include:
- A compelling subject line (put on its own line starting with "Subject: ")
- A brief, personalized opening referencing their recent funding
- Clear value proposition or reason for reaching out
- A soft call to action
Keep the body under 150 words.`,

  LINKEDIN_MESSAGE: `Write a short LinkedIn connection message or DM.
- Keep it under 100 words
- Be personal and conversational
- Reference their recent funding news
- End with a genuine interest in connecting
Do NOT include a subject line.`,

  FOLLOW_UP: `Write a brief follow-up message.
- Reference your previous outreach
- Keep it concise and respectful
- Include a soft call to action
Keep it under 100 words.`,

  INTRODUCTION_REQUEST: `Write an email requesting a warm introduction to this company from a mutual connection.
Include:
- Subject line starting with "Subject: "
- Brief context on why you want the introduction
- What you can offer or why the connection would be valuable
- Make it easy for the introducer to forward
Keep it under 150 words.`,
}

export async function generateOutreach(
  userId: string,
  companyId: string,
  type: OutreachType
): Promise<{ subject?: string; body: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { openaiKeyEncrypted: true },
  })

  if (!user?.openaiKeyEncrypted) {
    throw new Error('OpenAI API key not configured. Please add it in Settings.')
  }

  const apiKey = decrypt(user.openaiKeyEncrypted)

  const openai = new OpenAI({ apiKey })

  const context = await buildCompanyContext(companyId)

  const userPrompt = buildUserPrompt(context, type)

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 500,
  })

  const content = response.choices[0]?.message?.content || ''

  return parseResponse(content, type)
}

async function buildCompanyContext(companyId: string): Promise<CompanyContext> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      fundingEvents: {
        orderBy: { announcedAt: 'desc' },
        take: 1,
      },
      jobPostings: {
        where: {
          postedAt: { gte: thirtyDaysAgo },
          archivedAt: null,
        },
      },
      people: {
        where: { archivedAt: null },
        take: 3,
      },
    },
  })

  if (!company) {
    throw new Error('Company not found')
  }

  const latestFunding = company.fundingEvents[0]

  return {
    name: company.name,
    domain: company.domain,
    latestFunding: latestFunding
      ? {
          roundType: latestFunding.roundType.replace('_', ' '),
          amount: latestFunding.amountCents
            ? `$${(Number(latestFunding.amountCents) / 100).toLocaleString()}`
            : undefined,
          investors: latestFunding.investors || [],
          date: latestFunding.announcedAt.toLocaleDateString(),
        }
      : undefined,
    isHiring: company.jobPostings.length > 0,
    jobCount: company.jobPostings.length,
    contacts: company.people.map((p) => ({ name: p.name, role: p.role })),
  }
}

function buildUserPrompt(context: CompanyContext, type: OutreachType): string {
  let prompt = `${TYPE_PROMPTS[type]}\n\nCompany Information:\n`
  prompt += `- Company Name: ${context.name}\n`

  if (context.domain) {
    prompt += `- Website: ${context.domain}\n`
  }

  if (context.latestFunding) {
    prompt += `- Recent Funding: ${context.latestFunding.roundType}`
    if (context.latestFunding.amount) {
      prompt += ` (${context.latestFunding.amount})`
    }
    prompt += ` announced ${context.latestFunding.date}\n`

    if (context.latestFunding.investors.length > 0) {
      prompt += `- Investors: ${context.latestFunding.investors.join(', ')}\n`
    }
  }

  if (context.isHiring) {
    prompt += `- Currently hiring: Yes (${context.jobCount} open positions)\n`
  }

  if (context.contacts.length > 0) {
    prompt += `- Key contacts: ${context.contacts
      .map((c) => `${c.name}${c.role ? ` (${c.role})` : ''}`)
      .join(', ')}\n`
  }

  return prompt
}

function parseResponse(
  content: string,
  type: OutreachType
): { subject?: string; body: string } {
  const subjectMatch = content.match(/^Subject:\s*(.+)$/m)

  if (subjectMatch && type !== 'LINKEDIN_MESSAGE') {
    const subject = subjectMatch[1].trim()
    const body = content.replace(/^Subject:\s*.+$/m, '').trim()
    return { subject, body }
  }

  return { body: content.trim() }
}
