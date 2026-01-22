'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import type { SavedSearch } from '@prisma/client'

interface SavedSearchesListProps {
  searches: SavedSearch[]
}

export function SavedSearchesList({ searches: initialSearches }: SavedSearchesListProps) {
  const [searches, setSearches] = useState(initialSearches)

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/saved-searches/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSearches(searches.filter((s) => s.id !== id))
        toast.success('Search deleted')
      } else {
        toast.error('Failed to delete search')
      }
    } catch {
      toast.error('Something went wrong')
    }
  }

  const buildSearchUrl = (filters: Record<string, unknown>) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value))
      }
    })
    return `/dashboard?${params.toString()}`
  }

  if (searches.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h3 className="text-lg font-semibold text-gray-900">
          No saved searches yet
        </h3>
        <p className="mt-2 text-gray-600">
          Apply filters on the dashboard and save them for quick access.
        </p>
        <Link href="/dashboard">
          <Button className="mt-4">Go to Dashboard</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {searches.map((search) => {
        const filters = search.filters as {
          country?: string
          state?: string
          industry?: string
          roundType?: string
          hiringNow?: boolean
          minAmount?: number
          maxAmount?: number
        }

        return (
          <Card key={search.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{search.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleDelete(search.id)}
                >
                  Delete
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {filters.country && (
                    <Badge variant="secondary">
                      Country: {filters.country}
                    </Badge>
                  )}
                  {filters.state && (
                    <Badge variant="secondary">
                      State: {filters.state}
                    </Badge>
                  )}
                  {filters.industry && (
                    <Badge variant="secondary">
                      Industry: {filters.industry}
                    </Badge>
                  )}
                  {filters.roundType && (
                    <Badge variant="secondary">
                      Round: {filters.roundType.replace('_', ' ')}
                    </Badge>
                  )}
                  {filters.hiringNow && (
                    <Badge className="bg-green-100 text-green-800">
                      Hiring Now
                    </Badge>
                  )}
                  {filters.minAmount && (
                    <Badge variant="secondary">
                      Min: ${filters.minAmount.toLocaleString()}
                    </Badge>
                  )}
                  {filters.maxAmount && (
                    <Badge variant="secondary">
                      Max: ${filters.maxAmount.toLocaleString()}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-gray-500">
                    Created {formatDate(search.createdAt)}
                  </span>
                  <Link href={buildSearchUrl(filters)}>
                    <Button size="sm">Apply Search</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
