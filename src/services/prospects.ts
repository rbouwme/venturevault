import { prisma } from '@/lib/prisma'

export interface ProspectFilters {
  confidence?: 'high' | 'medium' | 'low'
  timeline?: string
  status?: string
  priority?: string
  signalType?: string
  country?: string
}

export interface CreateProspectInput {
  userId: string
  companyId: string
  source?: string
  priority?: string
  confidenceScore?: number
  timelinePrediction?: string | null
  signalCount?: number
}

export interface UpdateProspectInput {
  status?: string
  priority?: string
  nextAction?: string
  nextActionDate?: Date | null
  lastContactedAt?: Date | null
  confidenceScore?: number
  timelinePrediction?: string | null
  signalCount?: number
  lastSignalAt?: Date | null
}

export interface CreateNoteInput {
  prospectId: string
  userId: string
  content: string
  type?: string
  reminderDate?: Date | null
}

export interface UpdateNoteInput {
  content?: string
  completed?: boolean
  reminderDate?: Date | null
}

/**
 * Get all prospects for a user with optional filters
 */
export async function getProspects(userId: string, filters?: ProspectFilters) {
  const where: any = {
    userId,
    archivedAt: null,
  }

  // Confidence filter
  if (filters?.confidence) {
    if (filters.confidence === 'high') {
      where.confidenceScore = { gte: 0.7 }
    } else if (filters.confidence === 'medium') {
      where.confidenceScore = { gte: 0.5, lt: 0.7 }
    } else if (filters.confidence === 'low') {
      where.confidenceScore = { lt: 0.5 }
    }
  }

  // Timeline filter
  if (filters?.timeline) {
    where.timelinePrediction = filters.timeline
  }

  // Status filter
  if (filters?.status) {
    where.status = filters.status
  }

  // Priority filter
  if (filters?.priority) {
    where.priority = filters.priority
  }

  // Country filter (region scoping)
  if (filters?.country) {
    where.company = { country: filters.country }
  }

  const prospects = await prisma.prospect.findMany({
    where,
    include: {
      company: {
        select: {
          id: true,
          name: true,
          domain: true,
          logoUrl: true,
          description: true,
          country: true,
          state: true,
          city: true,
          tags: true,
          headcount: true,
          ycBatch: true,
        },
      },
      signals: {
        where: { expiresAt: { gte: new Date() } },
        orderBy: { detectedAt: 'desc' },
        take: 10,
      },
      _count: {
        select: {
          notes: true,
        },
      },
    },
    orderBy: [{ confidenceScore: 'desc' }, { createdAt: 'desc' }],
  })

  // Filter by signal type if requested
  if (filters?.signalType) {
    return prospects.filter((p) => p.signals.some((s) => s.type === filters.signalType))
  }

  return prospects
}

/**
 * Get a single prospect with full details
 */
export async function getProspectById(userId: string, prospectId: string) {
  return prisma.prospect.findFirst({
    where: {
      id: prospectId,
      userId,
      archivedAt: null,
    },
    include: {
      company: {
        include: {
          fundingEvents: {
            orderBy: { announcedAt: 'desc' },
            take: 5,
          },
          jobPostings: {
            where: { archivedAt: null },
            orderBy: { postedAt: 'desc' },
            take: 10,
          },
        },
      },
      signals: {
        orderBy: { detectedAt: 'desc' },
      },
      notes: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}

/**
 * Create a new prospect
 */
export async function createProspect(data: CreateProspectInput) {
  // Check if prospect already exists
  const existing = await prisma.prospect.findUnique({
    where: {
      userId_companyId: {
        userId: data.userId,
        companyId: data.companyId,
      },
    },
  })

  if (existing) {
    throw new Error('Prospect already exists for this company')
  }

  return prisma.prospect.create({
    data: {
      userId: data.userId,
      companyId: data.companyId,
      source: data.source || 'MANUAL',
      priority: data.priority || 'MEDIUM',
      confidenceScore: data.confidenceScore || 0.0,
      timelinePrediction: data.timelinePrediction,
      signalCount: data.signalCount || 0,
      lastSignalAt: data.signalCount && data.signalCount > 0 ? new Date() : null,
    },
    include: {
      company: true,
    },
  })
}

/**
 * Update an existing prospect
 */
export async function updateProspect(userId: string, prospectId: string, data: UpdateProspectInput) {
  // Verify ownership
  const prospect = await prisma.prospect.findFirst({
    where: { id: prospectId, userId },
  })

  if (!prospect) {
    throw new Error('Prospect not found')
  }

  return prisma.prospect.update({
    where: { id: prospectId },
    data,
    include: {
      company: true,
      signals: true,
    },
  })
}

/**
 * Archive a prospect (soft delete)
 */
export async function archiveProspect(userId: string, prospectId: string) {
  const prospect = await prisma.prospect.findFirst({
    where: { id: prospectId, userId },
  })

  if (!prospect) {
    throw new Error('Prospect not found')
  }

  return prisma.prospect.update({
    where: { id: prospectId },
    data: { archivedAt: new Date() },
  })
}

/**
 * Convert prospect to outreach (mark as converted)
 */
export async function convertProspect(userId: string, prospectId: string) {
  const prospect = await prisma.prospect.findFirst({
    where: { id: prospectId, userId },
  })

  if (!prospect) {
    throw new Error('Prospect not found')
  }

  return prisma.prospect.update({
    where: { id: prospectId },
    data: {
      status: 'CONVERTED',
      convertedAt: new Date(),
    },
    include: {
      company: true,
    },
  })
}

// ============================================
// NOTES
// ============================================

/**
 * Get all notes for a prospect
 */
export async function getProspectNotes(prospectId: string) {
  return prisma.prospectNote.findMany({
    where: { prospectId },
    orderBy: [{ reminderDate: 'asc' }, { createdAt: 'desc' }],
  })
}

/**
 * Create a note for a prospect
 */
export async function createProspectNote(data: CreateNoteInput) {
  return prisma.prospectNote.create({
    data: {
      prospectId: data.prospectId,
      userId: data.userId,
      content: data.content,
      type: data.type || 'NOTE',
      reminderDate: data.reminderDate,
    },
  })
}

/**
 * Update a note
 */
export async function updateProspectNote(
  userId: string,
  noteId: string,
  data: UpdateNoteInput
) {
  // Verify ownership
  const note = await prisma.prospectNote.findFirst({
    where: { id: noteId, userId },
  })

  if (!note) {
    throw new Error('Note not found')
  }

  return prisma.prospectNote.update({
    where: { id: noteId },
    data,
  })
}

/**
 * Delete a note
 */
export async function deleteProspectNote(userId: string, noteId: string) {
  const note = await prisma.prospectNote.findFirst({
    where: { id: noteId, userId },
  })

  if (!note) {
    throw new Error('Note not found')
  }

  return prisma.prospectNote.delete({
    where: { id: noteId },
  })
}

/**
 * Get upcoming reminders for a user (next 7 days)
 */
export async function getUpcomingReminders(userId: string) {
  const now = new Date()
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  return prisma.prospectNote.findMany({
    where: {
      userId,
      type: 'REMINDER',
      completed: false,
      reminderDate: { gte: now, lte: sevenDaysFromNow },
    },
    include: {
      prospect: {
        include: {
          company: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { reminderDate: 'asc' },
  })
}

/**
 * Get prospect statistics for a user
 */
export async function getProspectStats(userId: string) {
  const [total, converted, highConfidence, upcomingReminders] = await Promise.all([
    prisma.prospect.count({
      where: { userId, archivedAt: null },
    }),
    prisma.prospect.count({
      where: { userId, status: 'CONVERTED', archivedAt: null },
    }),
    prisma.prospect.count({
      where: { userId, confidenceScore: { gte: 0.7 }, archivedAt: null },
    }),
    prisma.prospectNote.count({
      where: {
        userId,
        type: 'REMINDER',
        completed: false,
        reminderDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ])

  const avgConfidence = await prisma.prospect.aggregate({
    where: { userId, archivedAt: null },
    _avg: { confidenceScore: true },
  })

  const conversionRate = total > 0 ? (converted / total) * 100 : 0

  return {
    total,
    converted,
    highConfidence,
    upcomingReminders,
    avgConfidence: avgConfidence._avg.confidenceScore || 0,
    conversionRate: conversionRate.toFixed(1),
  }
}
