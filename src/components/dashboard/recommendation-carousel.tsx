'use client'

import { useEffect, useState } from 'react'
import { RecommendationCard } from './recommendation-card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Recommendation {
  id: string
  score: number
  matchReason: string
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
    oneLiner: string | null
    isHiring: boolean
  }
}

function CarouselSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="w-[280px] flex-shrink-0">
          <div className="bg-card rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Skeleton className="w-12 h-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function RecommendationCarousel() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const response = await fetch('/api/recommendations?limit=10')

        if (!response.ok) {
          throw new Error('Failed to fetch recommendations')
        }

        const data = await response.json()
        setRecommendations(data.recommendations || [])

        // Mark as viewed
        if (data.recommendations?.length > 0) {
          data.recommendations.forEach((rec: Recommendation) => {
            fetch('/api/recommendations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                companyId: rec.company.id,
                action: 'view',
              }),
            }).catch(console.error)
          })
        }
      } catch (err) {
        console.error('Error fetching recommendations:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchRecommendations()
  }, [])

  useEffect(() => {
    const container = document.getElementById('recommendations-scroll')
    if (!container) return

    const updateScrollButtons = () => {
      setCanScrollLeft(container.scrollLeft > 0)
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 10
      )
    }

    updateScrollButtons()
    container.addEventListener('scroll', updateScrollButtons)
    window.addEventListener('resize', updateScrollButtons)

    return () => {
      container.removeEventListener('scroll', updateScrollButtons)
      window.removeEventListener('resize', updateScrollButtons)
    }
  }, [recommendations])

  const scroll = (direction: 'left' | 'right') => {
    const container = document.getElementById('recommendations-scroll')
    if (!container) return

    const scrollAmount = 300
    const newPosition =
      direction === 'left'
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount

    container.scrollTo({
      left: newPosition,
      behavior: 'smooth',
    })
  }

  const handleTrackClick = async (companyId: string) => {
    try {
      await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          action: 'click',
        }),
      })
    } catch (error) {
      console.error('Error tracking click:', error)
    }
  }

  const handleAddToWatchlist = (companyId: string) => {
    // Remove from recommendations after adding to watchlist
    setRecommendations(prev => prev.filter(r => r.company.id !== companyId))
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Recommended for You
            </h2>
            <p className="text-sm text-muted-foreground">
              Companies similar to your watchlist
            </p>
          </div>
        </div>
        <CarouselSkeleton />
      </div>
    )
  }

  if (error) {
    return null // Silently fail - recommendations are optional
  }

  if (recommendations.length === 0) {
    return null // Don't show section if no recommendations
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Recommended for You
          </h2>
          <p className="text-sm text-muted-foreground">
            {recommendations[0]?.matchReason === 'POPULAR_TRENDING'
              ? 'Trending companies in your industry'
              : 'Companies similar to your watchlist'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        id="recommendations-scroll"
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {recommendations.map((recommendation) => (
          <RecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
            onAddToWatchlist={handleAddToWatchlist}
            onTrackClick={handleTrackClick}
          />
        ))}
      </div>

      <style jsx>{`
        #recommendations-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}
