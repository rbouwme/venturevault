import { prisma } from '@/lib/prisma'

export type ApiProvider = 'APOLLO' | 'HUNTER' | 'SNOVIO' | 'NEWSAPI'

interface CreditLimits {
  APOLLO: number
  HUNTER: number
  SNOVIO: number
  NEWSAPI: number
}

// Free tier limits
const DEFAULT_LIMITS: CreditLimits = {
  APOLLO: 50, // 50 credits/month
  HUNTER: 25, // 25 searches/month
  SNOVIO: 50, // 50 credits/month
  NEWSAPI: 500, // 500 requests/day
}

/**
 * Get current credit usage for a provider
 */
export async function getCredits(provider: ApiProvider) {
  const credits = await prisma.apiCredits.findUnique({
    where: { provider },
  })

  if (!credits) {
    // Initialize credits tracking for this provider
    const resetDate = getNextResetDate(provider)
    return prisma.apiCredits.create({
      data: {
        provider,
        creditsUsed: 0,
        creditsLimit: DEFAULT_LIMITS[provider],
        resetDate,
      },
    })
  }

  // Check if we need to reset credits
  if (new Date() >= credits.resetDate) {
    return prisma.apiCredits.update({
      where: { provider },
      data: {
        creditsUsed: 0,
        resetDate: getNextResetDate(provider),
      },
    })
  }

  return credits
}

/**
 * Check if we have enough credits available
 */
export async function hasCredits(
  provider: ApiProvider,
  amount: number = 1
): Promise<boolean> {
  const credits = await getCredits(provider)
  return credits.creditsUsed + amount <= credits.creditsLimit
}

/**
 * Use credits for an API call
 */
export async function useCredits(
  provider: ApiProvider,
  amount: number = 1
): Promise<boolean> {
  const credits = await getCredits(provider)

  if (credits.creditsUsed + amount > credits.creditsLimit) {
    console.warn(`${provider}: Credit limit exceeded`)
    return false
  }

  await prisma.apiCredits.update({
    where: { provider },
    data: {
      creditsUsed: credits.creditsUsed + amount,
    },
  })

  return true
}

/**
 * Get remaining credits for a provider
 */
export async function getRemainingCredits(
  provider: ApiProvider
): Promise<number> {
  const credits = await getCredits(provider)
  return Math.max(0, credits.creditsLimit - credits.creditsUsed)
}

/**
 * Get all credit statuses
 */
export async function getAllCredits() {
  const providers: ApiProvider[] = ['APOLLO', 'HUNTER', 'SNOVIO', 'NEWSAPI']
  const credits = await Promise.all(providers.map(getCredits))

  return credits.map((c) => ({
    provider: c.provider,
    used: c.creditsUsed,
    limit: c.creditsLimit,
    remaining: c.creditsLimit - c.creditsUsed,
    resetDate: c.resetDate,
  }))
}

export interface ServiceStatus {
  configured: boolean
  credits: number
  limit: number
  resetDate?: Date
}

/**
 * Get available enrichment services with their status
 */
export async function getAvailableServices(): Promise<{
  apollo: ServiceStatus
  hunter: ServiceStatus
  snovio: ServiceStatus
}> {
  // We'll import these clients after they're created
  // For now, check env vars
  const apolloConfigured = !!process.env.APOLLO_API_KEY
  const hunterConfigured = !!process.env.HUNTER_API_KEY
  const snovioConfigured = !!process.env.SNOVIO_API_KEY

  const [apolloCredits, hunterCredits, snovioCredits] = await Promise.all([
    apolloConfigured ? getCredits('APOLLO') : null,
    hunterConfigured ? getCredits('HUNTER') : null,
    snovioConfigured ? getCredits('SNOVIO') : null,
  ])

  return {
    apollo: {
      configured: apolloConfigured,
      credits: apolloCredits ? apolloCredits.creditsLimit - apolloCredits.creditsUsed : 0,
      limit: apolloCredits?.creditsLimit || DEFAULT_LIMITS.APOLLO,
      resetDate: apolloCredits?.resetDate,
    },
    hunter: {
      configured: hunterConfigured,
      credits: hunterCredits ? hunterCredits.creditsLimit - hunterCredits.creditsUsed : 0,
      limit: hunterCredits?.creditsLimit || DEFAULT_LIMITS.HUNTER,
      resetDate: hunterCredits?.resetDate,
    },
    snovio: {
      configured: snovioConfigured,
      credits: snovioCredits ? snovioCredits.creditsLimit - snovioCredits.creditsUsed : 0,
      limit: snovioCredits?.creditsLimit || DEFAULT_LIMITS.SNOVIO,
      resetDate: snovioCredits?.resetDate,
    },
  }
}

/**
 * Calculate next reset date based on provider
 */
function getNextResetDate(provider: ApiProvider): Date {
  const now = new Date()

  if (provider === 'NEWSAPI') {
    // NewsAPI resets daily at midnight UTC
    const tomorrow = new Date(now)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    tomorrow.setUTCHours(0, 0, 0, 0)
    return tomorrow
  }

  // Apollo and Hunter reset monthly (first of next month)
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return nextMonth
}
