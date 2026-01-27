import { DashboardContent } from '@/components/dashboard/dashboard-content'
import type { FundingFilters as Filters } from '@/types'

interface DashboardPageProps {
  searchParams: Promise<{
    country?: string
    state?: string
    city?: string
    metro?: string
    industry?: string
    roundType?: string
    minAmount?: string
    maxAmount?: string
    hiringNow?: string
    sortBy?: string
    page?: string
  }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams

  const filters: Filters = {
    country: params.country,
    state: params.state,
    city: params.city,
    metro: params.metro,
    industry: params.industry,
    roundType: params.roundType,
    minAmount: params.minAmount ? parseInt(params.minAmount) : undefined,
    maxAmount: params.maxAmount ? parseInt(params.maxAmount) : undefined,
    hiringNow: params.hiringNow === 'true',
    sortBy: (params.sortBy as 'newest' | 'amount') || 'newest',
    page: params.page ? parseInt(params.page) : 1,
    limit: 20,
  }

  return <DashboardContent filters={filters} />
}
