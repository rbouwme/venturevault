import { prisma } from '@/lib/prisma'
import type { OutreachStatus, OutreachType } from '@prisma/client'

export async function getWatchlist(userId: string, country?: string) {
  return prisma.watchlist.findMany({
    where: {
      userId,
      ...(country ? { company: { country } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      company: {
        include: {
          fundingEvents: {
            take: 1,
            orderBy: { announcedAt: 'desc' },
          },
          _count: {
            select: {
              jobPostings: {
                where: {
                  postedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                  archivedAt: null,
                },
              },
            },
          },
        },
      },
    },
  })
}

export async function addToWatchlist(userId: string, companyId: string, notes?: string) {
  return prisma.watchlist.create({
    data: { userId, companyId, notes },
  })
}

export async function removeFromWatchlist(userId: string, companyId: string) {
  return prisma.watchlist.delete({
    where: {
      userId_companyId: { userId, companyId },
    },
  })
}

export async function updateWatchlistNotes(userId: string, companyId: string, notes: string) {
  return prisma.watchlist.update({
    where: {
      userId_companyId: { userId, companyId },
    },
    data: { notes },
  })
}

export async function isCompanyWatchlisted(userId: string, companyId: string) {
  const item = await prisma.watchlist.findUnique({
    where: {
      userId_companyId: { userId, companyId },
    },
  })
  return !!item
}

export async function getSavedSearches(userId: string, country?: string) {
  const all = await prisma.savedSearch.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
  if (!country) return all
  // Filter to saved searches that have matching country or no country set
  return all.filter((s) => {
    try {
      const f = JSON.parse(s.filters as string)
      return !f.country || f.country === country
    } catch {
      return true
    }
  })
}

export async function createSavedSearch(
  userId: string,
  name: string,
  filters: object
) {
  return prisma.savedSearch.create({
    data: { userId, name, filters: JSON.stringify(filters) },
  })
}

export async function deleteSavedSearch(userId: string, id: string) {
  return prisma.savedSearch.delete({
    where: { id, userId },
  })
}

export async function getOutreachDrafts(userId: string) {
  return prisma.outreachDraft.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      company: true,
    },
  })
}

export async function createOutreachDraft(
  userId: string,
  companyId: string,
  type: OutreachType,
  subject: string | null,
  body: string
) {
  return prisma.outreachDraft.create({
    data: { userId, companyId, type, subject, body },
  })
}

export async function updateOutreachDraftStatus(
  userId: string,
  id: string,
  status: OutreachStatus
) {
  return prisma.outreachDraft.update({
    where: { id, userId },
    data: { status },
  })
}

export async function deleteOutreachDraft(userId: string, id: string) {
  return prisma.outreachDraft.delete({
    where: { id, userId },
  })
}

export async function getAlerts(userId: string) {
  return prisma.alert.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createAlert(
  userId: string,
  name: string,
  filters: object,
  email: string
) {
  return prisma.alert.create({
    data: { userId, name, filters: JSON.stringify(filters), email },
  })
}

export async function updateAlert(
  userId: string,
  id: string,
  data: { name?: string; filters?: object; email?: string; enabled?: boolean }
) {
  const updateData: { name?: string; filters?: string; email?: string; enabled?: boolean } = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.email !== undefined) updateData.email = data.email
  if (data.enabled !== undefined) updateData.enabled = data.enabled
  if (data.filters !== undefined) updateData.filters = JSON.stringify(data.filters)

  return prisma.alert.update({
    where: { id, userId },
    data: updateData,
  })
}

export async function deleteAlert(userId: string, id: string) {
  return prisma.alert.delete({
    where: { id, userId },
  })
}

export async function getUserSettings(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      openaiKeyEncrypted: true,
      linkedinUrl: true,
    },
  })
}

export async function updateUserSettings(
  userId: string,
  data: { name?: string; openaiKeyEncrypted?: string; linkedinUrl?: string | null }
) {
  return prisma.user.update({
    where: { id: userId },
    data,
  })
}
