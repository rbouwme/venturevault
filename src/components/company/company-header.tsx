'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { CompanyWithRelations } from '@/types'

function parseTags(tags: string | string[] | null): string[] {
  if (!tags) return []
  if (Array.isArray(tags)) return tags
  try {
    return JSON.parse(tags)
  } catch {
    return []
  }
}

interface CompanyHeaderProps {
  company: CompanyWithRelations
}

export function CompanyHeader({ company }: CompanyHeaderProps) {
  const { data: session } = useSession()
  const [isWatchlisted, setIsWatchlisted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleWatchlist = async () => {
    if (!session?.user) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/watchlist', {
        method: isWatchlisted ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: company.id }),
      })

      if (response.ok) {
        setIsWatchlisted(!isWatchlisted)
        toast.success(isWatchlisted ? 'Removed from watchlist' : 'Added to watchlist')
      } else {
        toast.error('Failed to update watchlist')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const latestFunding = company.fundingEvents[0]
  const isHiring = company.jobPostings.length > 0

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{company.name}</h1>
            {isHiring && (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100 dark:hover:bg-green-900">
                Hiring
              </Badge>
            )}
          </div>

          {company.domain && (
            <a
              href={`https://${company.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {company.domain}
            </a>
          )}

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {company.city && <span>{company.city}</span>}
            {company.state && <span>{company.state}</span>}
            {company.country && <span>{company.country}</span>}
          </div>

          {parseTags(company.tags).length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {parseTags(company.tags).map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:items-end gap-2">
          <Button
            variant={isWatchlisted ? 'default' : 'outline'}
            onClick={handleWatchlist}
            disabled={isLoading}
          >
            {isWatchlisted ? '⭐ Watchlisted' : '☆ Add to Watchlist'}
          </Button>

          {company.linkedinUrl && (
            <a
              href={company.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              View on LinkedIn →
            </a>
          )}
        </div>
      </div>

      {latestFunding && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Latest funding:{' '}
            <span className="font-medium text-foreground">
              {latestFunding.roundType.replace('_', ' ')}
            </span>
            {latestFunding.amountCents && (
              <>
                {' - '}
                <span className="font-medium text-foreground">
                  ${(Number(latestFunding.amountCents) / 100).toLocaleString()}
                </span>
              </>
            )}
            {' on '}
            {new Date(latestFunding.announcedAt).toLocaleDateString()}
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Feed
        </Link>
      </div>
    </div>
  )
}
