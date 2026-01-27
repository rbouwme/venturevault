import { NextResponse } from 'next/server'
import {
  computeAllRecommendations,
  cleanupExpiredRecommendations,
} from '@/services/recommendations'

/**
 * Automated Recommendations Cron Job
 *
 * Runs daily at 3 AM UTC (after signal detection) to:
 * 1. Compute personalized recommendations for all users
 * 2. Clean up expired recommendations (>24 hours old)
 * 3. Store top 10 recommendations per user
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron] Starting recommendations computation job...')

    // Step 1: Compute recommendations for all users
    const computeResults = await computeAllRecommendations()

    console.log(
      `[Cron] Computed recommendations for ${computeResults.usersProcessed} users, created ${computeResults.recommendationsCreated} recommendations`
    )

    if (computeResults.errors.length > 0) {
      console.error('[Cron] Errors during computation:', computeResults.errors)
    }

    // Step 2: Clean up expired recommendations
    const deletedCount = await cleanupExpiredRecommendations()

    console.log(`[Cron] Cleaned up ${deletedCount} expired recommendations`)

    console.log('[Cron] Recommendations job completed successfully')

    return NextResponse.json({
      success: true,
      summary: {
        usersProcessed: computeResults.usersProcessed,
        recommendationsCreated: computeResults.recommendationsCreated,
        expiredRecommendationsDeleted: deletedCount,
        errors: computeResults.errors.length,
        errorDetails: computeResults.errors,
      },
    })
  } catch (error) {
    console.error('[Cron] Fatal error in recommendations job:', error)
    return NextResponse.json(
      { error: 'Recommendations job failed', details: String(error) },
      { status: 500 }
    )
  }
}
