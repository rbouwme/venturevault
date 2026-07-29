import { prisma } from '@/lib/prisma'
import type { Company } from '@prisma/client'

// ============================================
// TYPES
// ============================================

interface MatchFactors {
  tagMatch: number
  locationMatch: number
  fundingStageMatch: number
  sizeMatch: number
}

interface SimilarityResult {
  score: number
  factors: MatchFactors
}

export interface RecommendationWithCompany {
  id: string
  score: number
  matchReason: string
  matchFactors: MatchFactors
  createdAt: Date
  company: {
    id: string
    name: string
    domain: string | null
    description: string | null
    logoUrl: string | null
    tags: string | null
    city: string | null
    state: string | null
    country: string | null
    headcount: number | null
    oneLiner: string | null
    isHiring: boolean
  }
}

// ============================================
// SIMILARITY SCORING FUNCTIONS
// ============================================

/**
 * Compute tag overlap using Jaccard similarity
 * Example: "fintech,payments,b2b" vs "fintech,saas,b2b" -> 0.67 (2/3 overlap)
 */
function computeTagOverlap(tags1: string | null, tags2: string | null): number {
  if (!tags1 || !tags2) return 0

  const set1 = new Set(tags1.toLowerCase().split(',').map(t => t.trim()).filter(Boolean))
  const set2 = new Set(tags2.toLowerCase().split(',').map(t => t.trim()).filter(Boolean))

  if (set1.size === 0 || set2.size === 0) return 0

  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])

  return intersection.size / union.size
}

/**
 * Compute location match score
 * Exact city = 1.0, same state = 0.7, same country = 0.4, different = 0.0
 */
function computeLocationMatch(
  company1: Pick<Company, 'city' | 'state' | 'country'>,
  company2: Pick<Company, 'city' | 'state' | 'country'>
): number {
  if (!company1.city && !company1.state && !company1.country) return 0
  if (!company2.city && !company2.state && !company2.country) return 0

  // Exact city match
  if (
    company1.city &&
    company2.city &&
    company1.city.toLowerCase() === company2.city.toLowerCase()
  ) {
    return 1.0
  }

  // Same state, different city
  if (
    company1.state &&
    company2.state &&
    company1.state.toLowerCase() === company2.state.toLowerCase()
  ) {
    return 0.7
  }

  // Same country, different state
  if (
    company1.country &&
    company2.country &&
    company1.country.toLowerCase() === company2.country.toLowerCase()
  ) {
    return 0.4
  }

  return 0.0
}

/**
 * Compute funding stage match
 * Maps round types to numeric stages and compares proximity
 */
function computeFundingStageMatch(
  round1: string | null,
  round2: string | null
): number {
  if (!round1 || !round2) return 0

  const stageMap: Record<string, number> = {
    'pre-seed': 0,
    'seed': 1,
    'series a': 2,
    'series b': 3,
    'series c': 4,
    'series d': 5,
    'series e': 6,
    'series f': 7,
  }

  const normalize = (round: string): number => {
    const lower = round.toLowerCase().trim()
    for (const [key, value] of Object.entries(stageMap)) {
      if (lower.includes(key)) return value
    }
    return -1 // Unknown stage
  }

  const stage1 = normalize(round1)
  const stage2 = normalize(round2)

  if (stage1 === -1 || stage2 === -1) return 0

  const diff = Math.abs(stage1 - stage2)

  if (diff === 0) return 1.0 // Same stage
  if (diff === 1) return 0.5 // Adjacent stages
  if (diff === 2) return 0.3 // 2 stages apart
  return 0.2 // Far apart
}

/**
 * Compute size match based on headcount
 * Within 20% = 1.0, within 50% = 0.7, within 100% = 0.4, beyond = 0.2
 */
function computeSizeMatch(
  headcount1: number | null,
  headcount2: number | null
): number {
  if (!headcount1 || !headcount2) return 0
  if (headcount1 === 0 || headcount2 === 0) return 0

  const larger = Math.max(headcount1, headcount2)
  const smaller = Math.min(headcount1, headcount2)
  const percentDiff = ((larger - smaller) / smaller) * 100

  if (percentDiff <= 20) return 1.0
  if (percentDiff <= 50) return 0.7
  if (percentDiff <= 100) return 0.4
  return 0.2
}

/**
 * Compute overall similarity score between two companies
 */
function computeSimilarity(
  watchlistCompany: Company & { latestRound?: string | null },
  candidateCompany: Company & { latestRound?: string | null }
): SimilarityResult {
  const factors: MatchFactors = {
    tagMatch: computeTagOverlap(watchlistCompany.tags, candidateCompany.tags),
    locationMatch: computeLocationMatch(watchlistCompany, candidateCompany),
    fundingStageMatch: computeFundingStageMatch(
      watchlistCompany.latestRound || null,
      candidateCompany.latestRound || null
    ),
    sizeMatch: computeSizeMatch(
      watchlistCompany.headcount,
      candidateCompany.headcount
    ),
  }

  // Weighted scoring
  const weights = {
    tagMatch: 0.4, // Industry/sector most important
    locationMatch: 0.25, // Geographic proximity
    fundingStageMatch: 0.2, // Similar funding stage
    sizeMatch: 0.15, // Similar company size
  }

  const score =
    factors.tagMatch * weights.tagMatch +
    factors.locationMatch * weights.locationMatch +
    factors.fundingStageMatch * weights.fundingStageMatch +
    factors.sizeMatch * weights.sizeMatch

  return { score, factors }
}

// ============================================
// RECOMMENDATION FUNCTIONS
// ============================================

/**
 * Get popular/trending companies for users with empty watchlist
 */
async function getPopularCompanies(limit: number): Promise<Company[]> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  return await prisma.company.findMany({
    where: {
      archivedAt: null,
      OR: [
        {
          prospects: {
            some: {
              confidenceScore: { gte: 0.7 },
            },
          },
        },
        {
          jobPostings: {
            some: {
              postedAt: { gte: thirtyDaysAgo },
            },
          },
        },
        {
          fundingEvents: {
            some: {
              announcedAt: { gte: ninetyDaysAgo },
            },
          },
        },
      ],
    },
    include: {
      _count: {
        select: {
          prospects: true,
          fundingEvents: true,
          jobPostings: true,
        },
      },
    },
    orderBy: [
      { prospects: { _count: 'desc' } },
      { fundingEvents: { _count: 'desc' } },
    ],
    take: limit,
  })
}

/**
 * Compute recommendations for a specific user
 * Returns the number of recommendations created
 */
export async function computeRecommendationsForUser(
  userId: string
): Promise<number> {
  // Get user's watchlist
  const watchlist = await prisma.watchlist.findMany({
    where: { userId },
    include: {
      company: {
        include: {
          fundingEvents: {
            orderBy: { announcedAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  })

  // Get existing prospects and watchlist company IDs for exclusion
  const [prospects, watchlistCompanyIds] = await Promise.all([
    prisma.prospect.findMany({
      where: { userId, archivedAt: null },
      select: { companyId: true },
    }),
    Promise.resolve(watchlist.map(w => w.companyId)),
  ])

  const excludedCompanyIds = new Set([
    ...watchlistCompanyIds,
    ...prospects.map(p => p.companyId),
  ])

  let recommendations: {
    companyId: string
    score: number
    matchReason: string
    matchFactors: MatchFactors
  }[] = []

  if (watchlist.length === 0) {
    // Fallback: popular companies
    const popular = await getPopularCompanies(20)

    recommendations = popular
      .filter(c => !excludedCompanyIds.has(c.id))
      .slice(0, 10)
      .map(company => ({
        companyId: company.id,
        score: 0.8, // High score for popular companies
        matchReason: 'POPULAR_TRENDING',
        matchFactors: {
          tagMatch: 0,
          locationMatch: 0,
          fundingStageMatch: 0,
          sizeMatch: 0,
        },
      }))
  } else {
    // Similarity-based recommendations
    // Get candidate companies (recently active, not archived)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const candidates = await prisma.company.findMany({
      where: {
        archivedAt: null,
        id: { notIn: Array.from(excludedCompanyIds) },
        OR: [
          {
            jobPostings: {
              some: { postedAt: { gte: thirtyDaysAgo } },
            },
          },
          {
            fundingEvents: {
              some: {
                announcedAt: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
              },
            },
          },
          {
            prospects: {
              some: { confidenceScore: { gte: 0.5 } },
            },
          },
        ],
      },
      include: {
        fundingEvents: {
          orderBy: { announcedAt: 'desc' },
          take: 1,
        },
      },
      take: 1000, // Limit candidate pool
    })

    // Score each candidate against all watchlist companies
    const scoredCandidates = candidates.map(candidate => {
      let maxScore = 0
      let bestFactors: MatchFactors = {
        tagMatch: 0,
        locationMatch: 0,
        fundingStageMatch: 0,
        sizeMatch: 0,
      }

      // Compare against each watchlist company, take max score
      for (const watchlistItem of watchlist) {
        const watchlistCompany = {
          ...watchlistItem.company,
          latestRound: watchlistItem.company.fundingEvents[0]?.roundType || null,
        }
        const candidateWithRound = {
          ...candidate,
          latestRound: candidate.fundingEvents[0]?.roundType || null,
        }

        const similarity = computeSimilarity(watchlistCompany, candidateWithRound)

        if (similarity.score > maxScore) {
          maxScore = similarity.score
          bestFactors = similarity.factors
        }
      }

      return {
        companyId: candidate.id,
        score: maxScore,
        matchReason: 'WATCHLIST_SIMILAR',
        matchFactors: bestFactors,
      }
    })

    // Filter and sort by score
    recommendations = scoredCandidates
      .filter(r => r.score >= 0.2) // Minimum similarity threshold
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  }

  if (recommendations.length === 0) {
    return 0
  }

  // Delete old recommendations for this user
  await prisma.recommendation.deleteMany({
    where: { userId },
  })

  // Create new recommendations
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 24) // 24-hour TTL

  await prisma.recommendation.createMany({
    data: recommendations.map(rec => ({
      userId,
      companyId: rec.companyId,
      score: rec.score,
      matchReason: rec.matchReason,
      matchFactors: JSON.stringify(rec.matchFactors),
      expiresAt,
    })),
  })

  return recommendations.length
}

/**
 * Compute recommendations for all users
 * Called by cron job
 */
export async function computeAllRecommendations(): Promise<{
  usersProcessed: number
  recommendationsCreated: number
  errors: string[]
}> {
  const result = {
    usersProcessed: 0,
    recommendationsCreated: 0,
    errors: [] as string[],
  }

  // Get all active users
  const users = await prisma.user.findMany({
    where: { archivedAt: null },
    select: { id: true, email: true },
  })

  // Process in batches of 50
  const BATCH_SIZE = 50

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE)

    const batchResults = await Promise.allSettled(
      batch.map(async user => {
        const count = await computeRecommendationsForUser(user.id)
        return count
      })
    )

    batchResults.forEach((settled, idx) => {
      result.usersProcessed++

      if (settled.status === 'fulfilled') {
        result.recommendationsCreated += settled.value
      } else {
        const user = batch[idx]
        result.errors.push(`Error for user ${user.email}: ${settled.reason}`)
      }
    })

    console.log(`[Recommendations] Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(users.length / BATCH_SIZE)}`)
  }

  return result
}

/**
 * Clean up expired recommendations
 */
export async function cleanupExpiredRecommendations(): Promise<number> {
  const deleted = await prisma.recommendation.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  })

  return deleted.count
}

/**
 * Get recommendations for a user (for display)
 */
export async function getRecommendations(
  userId: string,
  limit: number = 10
): Promise<RecommendationWithCompany[]> {
  const recommendations = await prisma.recommendation.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() }, // Not expired
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          domain: true,
          description: true,
          logoUrl: true,
          tags: true,
          city: true,
          state: true,
          country: true,
          headcount: true,
          oneLiner: true,
          isHiring: true,
        },
      },
    },
    orderBy: { score: 'desc' },
    take: limit,
  })

  return recommendations.map(rec => ({
    id: rec.id,
    score: rec.score,
    matchReason: rec.matchReason,
    matchFactors: rec.matchFactors ? JSON.parse(rec.matchFactors) : {},
    createdAt: rec.createdAt,
    company: rec.company,
  }))
}

/**
 * Track recommendation view
 */
export async function markRecommendationViewed(
  userId: string,
  companyId: string
): Promise<void> {
  await prisma.recommendation.updateMany({
    where: {
      userId,
      companyId,
      viewedAt: null,
    },
    data: {
      viewedAt: new Date(),
    },
  })
}

/**
 * Track recommendation click
 */
export async function markRecommendationClicked(
  userId: string,
  companyId: string
): Promise<void> {
  await prisma.recommendation.updateMany({
    where: {
      userId,
      companyId,
      clickedAt: null,
    },
    data: {
      clickedAt: new Date(),
    },
  })
}
