'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { REGION_PREF_KEY, getRegionFeedUrl } from '@/lib/regions'
import type { RegionId } from '@/lib/regions'

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REGION_PREF_KEY)
      if (saved) {
        const { region, city } = JSON.parse(saved) as { region: RegionId; city: string }
        router.replace(getRegionFeedUrl(region, city))
      } else {
        router.replace('/dashboard/select')
      }
    } catch {
      router.replace('/dashboard/select')
    }
  }, [router])

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-sm text-muted-foreground">Loading...</div>
    </div>
  )
}
