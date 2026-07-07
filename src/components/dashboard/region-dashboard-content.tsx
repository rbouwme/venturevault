'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MapPin, ChevronDown } from 'lucide-react'
import { REGION_PREF_KEY } from '@/lib/regions'
import { DashboardTabs } from './dashboard-tabs'
import { FundingFilters } from './funding-filters'
import { FundingFeed } from './funding-feed'
import { IndustryBrowser } from './industry-browser'
import { RecommendationCarousel } from './recommendation-carousel'
import { REGIONS } from '@/lib/regions'
import type { RegionId, CityConfig } from '@/lib/regions'
import type { FundingFilters as Filters } from '@/types'

interface RegionDashboardContentProps {
  filters: Filters
  region: RegionId
  regionLabel: string
  regionFlag: string
  activeCity?: CityConfig
  lockedCountry: string
}

export function RegionDashboardContent({
  filters,
  region,
  regionLabel,
  regionFlag,
  activeCity,
  lockedCountry,
}: RegionDashboardContentProps) {
  const [activeTab, setActiveTab] = useState<'funding' | 'browse'>('funding')
  const regionConfig = REGIONS[region]
  const router = useRouter()

  function handleSwitchRegion() {
    try { localStorage.removeItem(REGION_PREF_KEY) } catch {}
    router.push('/dashboard/select')
  }

  return (
    <div className="space-y-6">
      {/* Region header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-foreground">
              {activeCity ? activeCity.label : regionLabel}
            </h1>
            {activeCity && (
              <span className="text-sm text-muted-foreground">{activeCity.description}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Recently funded startups in {activeCity ? activeCity.description || activeCity.label : regionLabel}
          </p>
        </div>

        {/* City switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {activeCity ? activeCity.label : 'All cities'}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {regionConfig.cities.map((city) => {
              const isActive = activeCity?.id === city.id
              const params = city.state ? `state=${city.state}` : `city=${encodeURIComponent(city.city || '')}`
              return (
                <Link
                  key={city.id}
                  href={`/dashboard/${region}?${params}`}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary border-primary/20 font-medium'
                      : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  {city.label}
                </Link>
              )
            })}
            <Link
              href={`/dashboard/${region}`}
              className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                !activeCity
                  ? 'bg-primary/10 text-primary border-primary/20 font-medium'
                  : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              All
            </Link>
          </div>
          <button
            onClick={handleSwitchRegion}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-md px-2 py-1"
          >
            Switch region
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>

      <RecommendationCarousel />

      <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'funding' ? (
        <>
          <FundingFilters lockedCountry={lockedCountry} />
          <FundingFeed filters={filters} />
        </>
      ) : (
        <IndustryBrowser />
      )}
    </div>
  )
}
