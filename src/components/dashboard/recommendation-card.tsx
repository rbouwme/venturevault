'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Star } from 'lucide-react'

interface RecommendationCardProps {
  recommendation: {
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
  onAddToWatchlist?: (companyId: string) => void
  onTrackClick?: (companyId: string) => void
}

function parseTags(tags: string | null): string[] {
  if (!tags) return []
  try {
    return JSON.parse(tags)
  } catch {
    return tags.split(',').map(t => t.trim()).filter(Boolean)
  }
}

export function RecommendationCard({
  recommendation,
  onAddToWatchlist,
  onTrackClick,
}: RecommendationCardProps) {
  const { company, matchReason, score } = recommendation
  const [isAdding, setIsAdding] = useState(false)
  const tags = parseTags(company.tags)

  const handleAddToWatchlist = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isAdding) return
    setIsAdding(true)

    try {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: company.id }),
      })

      if (response.ok) {
        onAddToWatchlist?.(company.id)
      }
    } catch (error) {
      console.error('Error adding to watchlist:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleCardClick = () => {
    onTrackClick?.(company.id)
  }

  const matchBadgeText =
    matchReason === 'POPULAR_TRENDING' ? 'Trending' : 'Similar Match'
  const matchBadgeColor =
    matchReason === 'POPULAR_TRENDING'
      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100'
      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'

  const confidenceBadge =
    score >= 0.7
      ? { text: 'High Match', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' }
      : score >= 0.5
      ? { text: 'Good Match', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' }
      : { text: 'Fair Match', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100' }

  return (
    <Link href={`/dashboard/companies/${company.id}`} onClick={handleCardClick}>
      <Card className="w-[280px] flex-shrink-0 hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              {company.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  className="w-10 h-10 rounded-lg object-contain"
                />
              ) : (
                <span className="text-xl font-bold text-primary">
                  {company.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm line-clamp-1 text-foreground">
                {company.name}
              </h3>
              {company.domain && (
                <p className="text-xs text-muted-foreground truncate">
                  {company.domain}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge className={matchBadgeColor} variant="secondary">
              {matchBadgeText}
            </Badge>
            {matchReason === 'WATCHLIST_SIMILAR' && (
              <Badge className={confidenceBadge.color} variant="secondary">
                {confidenceBadge.text}
              </Badge>
            )}
            {company.isHiring && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" variant="secondary">
                Hiring
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {company.oneLiner && (
            <p className="text-sm text-foreground/80 line-clamp-2">
              {company.oneLiner}
            </p>
          )}

          {!company.oneLiner && company.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {company.description}
            </p>
          )}

          {(company.city || company.state) && (
            <p className="text-xs text-muted-foreground">
              {[company.city, company.state].filter(Boolean).join(', ')}
            </p>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {tags.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{tags.length - 2}
                </span>
              )}
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleAddToWatchlist}
            disabled={isAdding}
          >
            <Star className="w-4 h-4 mr-1" />
            {isAdding ? 'Adding...' : 'Add to Watchlist'}
          </Button>
        </CardContent>
      </Card>
    </Link>
  )
}
