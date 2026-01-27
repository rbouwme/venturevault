import { prisma } from '@/lib/prisma'

// Signal types
export type SignalType =
  | 'HIRING_SPIKE'
  | 'NEWS_MENTION'
  | 'HEADCOUNT_GROWTH'
  | 'JOB_VELOCITY'
  | 'FUNDING_PATTERN'

export interface Signal {
  type: SignalType
  strength: number // 0.0 - 1.0
  description: string
  metadata: Record<string, any>
}

export interface CompanySignals {
  companyId: string
  signals: Signal[]
  confidenceScore: number
  timelinePrediction: string | null
}

/**
 * Detect hiring spike based on recent job postings
 * Threshold: 5+ jobs in 7 days = strong signal
 */
export async function detectHiringSpike(companyId: string): Promise<Signal | null> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // Count recent job postings
  const recentJobs = await prisma.jobPosting.count({
    where: {
      companyId,
      postedAt: { gte: sevenDaysAgo },
      archivedAt: null,
    },
  })

  const monthlyJobs = await prisma.jobPosting.count({
    where: {
      companyId,
      postedAt: { gte: thirtyDaysAgo },
      archivedAt: null,
    },
  })

  // Strong spike: 5+ jobs in 7 days
  if (recentJobs >= 5) {
    const strength = Math.min(recentJobs / 10, 1.0)
    return {
      type: 'HIRING_SPIKE',
      strength,
      description: `${recentJobs} new job postings in the last 7 days`,
      metadata: {
        jobsLast7Days: recentJobs,
        jobsLast30Days: monthlyJobs,
        detectedAt: new Date().toISOString(),
      },
    }
  }

  // Moderate spike: 10+ jobs in 30 days
  if (monthlyJobs >= 10) {
    const strength = Math.min(monthlyJobs / 20, 0.8)
    return {
      type: 'HIRING_SPIKE',
      strength,
      description: `${monthlyJobs} new job postings in the last 30 days`,
      metadata: {
        jobsLast7Days: recentJobs,
        jobsLast30Days: monthlyJobs,
        detectedAt: new Date().toISOString(),
      },
    }
  }

  return null
}

/**
 * Detect job posting velocity (consistent hiring over time)
 * Threshold: 3+ jobs/week for 4+ consecutive weeks
 */
export async function detectJobVelocity(companyId: string): Promise<Signal | null> {
  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)

  const jobs = await prisma.jobPosting.findMany({
    where: {
      companyId,
      postedAt: { gte: fourWeeksAgo },
      archivedAt: null,
    },
    select: { postedAt: true },
    orderBy: { postedAt: 'asc' },
  })

  if (jobs.length < 12) return null // Need at least 3/week * 4 weeks

  // Calculate weekly posting rate
  const weeksWithJobs = new Set<number>()
  jobs.forEach((job) => {
    const weekNumber = Math.floor(
      (new Date().getTime() - new Date(job.postedAt).getTime()) / (7 * 24 * 60 * 60 * 1000)
    )
    weeksWithJobs.add(weekNumber)
  })

  const avgJobsPerWeek = jobs.length / 4
  const consistentWeeks = weeksWithJobs.size

  if (avgJobsPerWeek >= 3 && consistentWeeks >= 4) {
    const strength = Math.min(avgJobsPerWeek / 10, 1.0)
    return {
      type: 'JOB_VELOCITY',
      strength,
      description: `Consistent hiring: ${avgJobsPerWeek.toFixed(1)} jobs/week over ${consistentWeeks} weeks`,
      metadata: {
        totalJobs: jobs.length,
        avgJobsPerWeek: avgJobsPerWeek.toFixed(1),
        weeksActive: consistentWeeks,
        detectedAt: new Date().toISOString(),
      },
    }
  }

  return null
}

/**
 * Analyze funding pattern to predict next round
 * Companies typically raise Series A/B/C every 12-24 months
 */
export async function detectFundingPattern(companyId: string): Promise<Signal | null> {
  const lastFunding = await prisma.fundingEvent.findFirst({
    where: { companyId },
    orderBy: { announcedAt: 'desc' },
  })

  if (!lastFunding) return null

  const monthsSinceLastFunding = Math.floor(
    (new Date().getTime() - new Date(lastFunding.announcedAt).getTime()) /
      (30 * 24 * 60 * 60 * 1000)
  )

  // Sweet spot: 12-24 months since last round
  if (monthsSinceLastFunding >= 12 && monthsSinceLastFunding <= 24) {
    const strength = monthsSinceLastFunding <= 18 ? 0.9 : 0.7
    return {
      type: 'FUNDING_PATTERN',
      strength,
      description: `${monthsSinceLastFunding} months since ${lastFunding.roundType} round`,
      metadata: {
        lastRound: lastFunding.roundType,
        monthsSince: monthsSinceLastFunding,
        lastAmount: lastFunding.amountCents?.toString(),
        detectedAt: new Date().toISOString(),
      },
    }
  }

  // Early indicator: 8-12 months
  if (monthsSinceLastFunding >= 8 && monthsSinceLastFunding < 12) {
    return {
      type: 'FUNDING_PATTERN',
      strength: 0.5,
      description: `${monthsSinceLastFunding} months since ${lastFunding.roundType} round - approaching typical funding window`,
      metadata: {
        lastRound: lastFunding.roundType,
        monthsSince: monthsSinceLastFunding,
        lastAmount: lastFunding.amountCents?.toString(),
        detectedAt: new Date().toISOString(),
      },
    }
  }

  return null
}

/**
 * Detect headcount growth trend
 * Note: This requires historical tracking, will return null for now
 */
export async function detectHeadcountGrowth(companyId: string): Promise<Signal | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { headcount: true },
  })

  if (!company?.headcount) return null

  // TODO: Implement historical headcount tracking
  // For now, we can infer growth from recent job postings
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const recentHires = await prisma.jobPosting.count({
    where: {
      companyId,
      postedAt: { gte: thirtyDaysAgo },
      archivedAt: null,
    },
  })

  // If they've posted jobs for 10%+ of current headcount
  const growthRate = recentHires / company.headcount
  if (growthRate >= 0.1) {
    return {
      type: 'HEADCOUNT_GROWTH',
      strength: Math.min(growthRate * 2, 1.0),
      description: `Hiring for ${recentHires} positions (${(growthRate * 100).toFixed(0)}% of current ${company.headcount} employees)`,
      metadata: {
        currentHeadcount: company.headcount,
        recentOpenings: recentHires,
        growthRate: growthRate.toFixed(2),
        detectedAt: new Date().toISOString(),
      },
    }
  }

  return null
}

/**
 * Detect all signals for a company
 */
export async function detectSignals(companyId: string): Promise<Signal[]> {
  const signals = await Promise.allSettled([
    detectHiringSpike(companyId),
    detectJobVelocity(companyId),
    detectFundingPattern(companyId),
    detectHeadcountGrowth(companyId),
  ])

  return signals
    .filter((result) => result.status === 'fulfilled' && result.value !== null)
    .map((result) => (result as PromiseFulfilledResult<Signal>).value)
}

/**
 * Calculate overall funding likelihood score based on weighted signals
 */
export function calculateFundingLikelihood(signals: Signal[]): number {
  const weights: Record<SignalType, number> = {
    HIRING_SPIKE: 0.35,
    NEWS_MENTION: 0.2,
    HEADCOUNT_GROWTH: 0.2,
    FUNDING_PATTERN: 0.15,
    JOB_VELOCITY: 0.1,
  }

  let score = 0.0

  signals.forEach((signal) => {
    const weight = weights[signal.type] || 0
    score += signal.strength * weight
  })

  return Math.min(score, 1.0)
}

/**
 * Predict funding timeline based on signals and company data
 */
export async function predictTimeline(
  companyId: string,
  signals: Signal[],
  confidenceScore: number
): Promise<string | null> {
  if (confidenceScore < 0.4) return null

  // Get last funding date
  const lastFunding = await prisma.fundingEvent.findFirst({
    where: { companyId },
    orderBy: { announcedAt: 'desc' },
  })

  const monthsSinceLastFunding = lastFunding
    ? Math.floor(
        (new Date().getTime() - new Date(lastFunding.announcedAt).getTime()) /
          (30 * 24 * 60 * 60 * 1000)
      )
    : 0

  // High confidence + ready timing = 1-3 months
  if (confidenceScore >= 0.8 && monthsSinceLastFunding >= 12) {
    return '1_3_MONTHS'
  }

  // Good confidence + approaching timing = 3-6 months
  if (confidenceScore >= 0.6 && monthsSinceLastFunding >= 10) {
    return '3_6_MONTHS'
  }

  // Moderate confidence + some timing = 6-12 months
  if (confidenceScore >= 0.4 && monthsSinceLastFunding >= 8) {
    return '6_12_MONTHS'
  }

  return '12_PLUS_MONTHS'
}

/**
 * Main function: Detect and score all signals for a company
 */
export async function analyzeCompany(companyId: string): Promise<CompanySignals> {
  const signals = await detectSignals(companyId)
  const confidenceScore = calculateFundingLikelihood(signals)
  const timelinePrediction = await predictTimeline(companyId, signals, confidenceScore)

  return {
    companyId,
    signals,
    confidenceScore,
    timelinePrediction,
  }
}

/**
 * Find candidate companies for analysis (those with recent activity)
 */
export async function findCandidateCompanies(): Promise<string[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const companiesWithActivity = await prisma.company.findMany({
    where: {
      archivedAt: null,
      OR: [
        {
          jobPostings: {
            some: {
              postedAt: { gte: thirtyDaysAgo },
              archivedAt: null,
            },
          },
        },
        {
          fundingEvents: {
            some: {
              announcedAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
            },
          },
        },
      ],
    },
    select: { id: true },
    take: 500, // Limit for performance
  })

  return companiesWithActivity.map((c) => c.id)
}
