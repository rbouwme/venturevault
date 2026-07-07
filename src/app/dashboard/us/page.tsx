import { RegionDashboardContent } from '@/components/dashboard/region-dashboard-content'
import { findCityByParam, REGIONS } from '@/lib/regions'
import type { FundingFilters as Filters } from '@/types'

interface PageProps {
  searchParams: Promise<{
    state?: string
    city?: string
    industry?: string
    roundType?: string
    minAmount?: string
    maxAmount?: string
    hiringNow?: string
    sortBy?: string
    page?: string
    search?: string
    headcount?: string
  }>
}

export default async function USPage({ searchParams }: PageProps) {
  const params = await searchParams

  const activeCity = findCityByParam('us', { state: params.state, city: params.city })

  const filters: Filters = {
    country: 'US',
    state: params.state,
    city: params.city,
    industry: params.industry,
    roundType: params.roundType,
    minAmount: params.minAmount ? parseInt(params.minAmount) : undefined,
    maxAmount: params.maxAmount ? parseInt(params.maxAmount) : undefined,
    hiringNow: params.hiringNow === 'true',
    sortBy: (params.sortBy as 'newest' | 'amount') || 'newest',
    page: params.page ? parseInt(params.page) : 1,
    limit: 20,
    search: params.search,
    headcount: params.headcount,
  }

  return (
    <RegionDashboardContent
      filters={filters}
      region="us"
      regionLabel={REGIONS.us.label}
      regionFlag={REGIONS.us.flag}
      activeCity={activeCity}
      lockedCountry="US"
    />
  )
}
