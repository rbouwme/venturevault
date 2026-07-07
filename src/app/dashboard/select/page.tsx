'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { REGIONS, REGION_PREF_KEY, getRegionFeedUrl } from '@/lib/regions'
import type { RegionId } from '@/lib/regions'
import { cn } from '@/lib/utils'

export default function SelectPage() {
  const router = useRouter()
  const [step, setStep] = useState<'region' | 'city'>('region')
  const [selectedRegion, setSelectedRegion] = useState<RegionId | null>(null)

  // If there's a saved preference, skip the selector
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REGION_PREF_KEY)
      if (saved) {
        const pref = JSON.parse(saved)
        router.replace(getRegionFeedUrl(pref.region, pref.city))
      }
    } catch {
      // ignore
    }
  }, [router])

  function handleRegionSelect(region: RegionId) {
    setSelectedRegion(region)
    setStep('city')
  }

  function handleCitySelect(cityId: string) {
    if (!selectedRegion) return
    try {
      localStorage.setItem(REGION_PREF_KEY, JSON.stringify({ region: selectedRegion, city: cityId }))
    } catch {
      // ignore
    }
    router.push(getRegionFeedUrl(selectedRegion, cityId))
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl space-y-8">

        {step === 'region' && (
          <>
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Where are you focused?
              </h1>
              <p className="text-sm text-muted-foreground">
                Choose a region to see relevant startup funding activity
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {(Object.values(REGIONS) as typeof REGIONS[RegionId][]).map((region) => (
                <button
                  key={region.id}
                  onClick={() => handleRegionSelect(region.id as RegionId)}
                  className={cn(
                    'group flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card p-10',
                    'hover:border-primary/50 hover:bg-primary/5 transition-colors text-left cursor-pointer'
                  )}
                >
                  <span className="text-5xl">{region.flag}</span>
                  <div className="text-center">
                    <p className="text-base font-semibold text-foreground">{region.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {region.cities.length} cities
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'city' && selectedRegion && (
          <>
            <div className="space-y-2">
              <button
                onClick={() => setStep('region')}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Pick a city
                </h1>
                <p className="text-sm text-muted-foreground">
                  {REGIONS[selectedRegion].flag} {REGIONS[selectedRegion].label}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {REGIONS[selectedRegion].cities.map((city) => (
                <button
                  key={city.id}
                  onClick={() => handleCitySelect(city.id)}
                  className={cn(
                    'flex flex-col items-start gap-1 rounded-lg border border-border bg-card px-5 py-4',
                    'hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer text-left'
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">{city.label}</p>
                  <p className="text-xs text-muted-foreground">{city.description}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
