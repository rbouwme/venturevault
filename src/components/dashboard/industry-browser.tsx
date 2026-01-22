'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface Company {
  id: string
  name: string
  domain: string | null
  oneLiner: string | null
  description: string | null
  country: string | null
  state: string | null
  city: string | null
  headcount: number | null
  tags: string | null
  ycBatch: string | null
  isHiring: boolean
  fundingEvents: Array<{
    roundType: string
    amountCents: bigint | null
    announcedAt: string
  }>
  _count: {
    jobPostings: number
    people: number
  }
}

interface Industry {
  industry: string
  count: number
}

export function IndustryBrowser() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [industries, setIndustries] = useState<Industry[]>([])
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all')
  const [hiringOnly, setHiringOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<{
    totalCompanies: number
    lastSyncedAt: string | null
  } | null>(null)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const limit = 20

  // Fetch sync status
  useEffect(() => {
    fetch('/api/companies/sync-yc')
      .then((res) => res.json())
      .then((data) => setSyncStatus(data))
      .catch(console.error)
  }, [])

  // Fetch industries
  useEffect(() => {
    fetch('/api/companies/industries')
      .then((res) => res.json())
      .then((data) => setIndustries(data.industries || []))
      .catch(console.error)
  }, [syncStatus])

  // Fetch companies
  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({
      industry: selectedIndustry,
      limit: String(limit),
      offset: String(page * limit),
      hiringOnly: String(hiringOnly),
    })

    fetch(`/api/companies/browse?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setCompanies(data.companies || [])
        setTotal(data.total || 0)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Failed to fetch companies:', error)
        setLoading(false)
      })
  }, [selectedIndustry, hiringOnly, page, syncStatus])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/companies/sync-yc', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        // Refresh sync status
        const statusRes = await fetch('/api/companies/sync-yc')
        const statusData = await statusRes.json()
        setSyncStatus(statusData)
        setPage(0)
      } else {
        console.error('Sync failed:', data.error)
      }
    } catch (error) {
      console.error('Sync error:', error)
    } finally {
      setSyncing(false)
    }
  }

  const formatAmount = (amountCents: bigint | null) => {
    if (!amountCents) return null
    const amount = Number(amountCents) / 100
    if (amount >= 1_000_000_000) {
      return `$${(amount / 1_000_000_000).toFixed(1)}B`
    }
    if (amount >= 1_000_000) {
      return `$${(amount / 1_000_000).toFixed(1)}M`
    }
    return `$${(amount / 1_000).toFixed(0)}K`
  }

  const parseTags = (tags: string | null): string[] => {
    if (!tags) return []
    try {
      return JSON.parse(tags)
    } catch {
      return []
    }
  }

  if (syncStatus?.totalCompanies === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No startups loaded yet
        </h3>
        <p className="text-gray-600 mb-4">
          Sync Y Combinator companies to browse 5,000+ startups by industry.
        </p>
        <Button onClick={handleSync} disabled={syncing}>
          {syncing ? 'Syncing...' : 'Sync YC Companies'}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg border">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-sm text-gray-600 mb-1 block">Industry</Label>
          <Select
            value={selectedIndustry}
            onValueChange={(v) => {
              setSelectedIndustry(v)
              setPage(0)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Industries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Industries ({total})</SelectItem>
              {industries.map((ind) => (
                <SelectItem key={ind.industry} value={ind.industry}>
                  {ind.industry} ({ind.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="hiringOnly"
            checked={hiringOnly}
            onCheckedChange={(checked) => {
              setHiringOnly(!!checked)
              setPage(0)
            }}
          />
          <Label htmlFor="hiringOnly" className="cursor-pointer">
            Hiring Now
          </Label>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{syncStatus?.totalCompanies?.toLocaleString()} companies</span>
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading companies...</div>
      ) : companies.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No companies found. Try adjusting your filters.
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {companies.map((company) => (
              <Link
                key={company.id}
                href={`/dashboard/companies/${company.id}`}
                className="block"
              >
                <Card className="hover:border-blue-300 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">
                            {company.name}
                          </h3>
                          {company.ycBatch && (
                            <Badge variant="secondary" className="text-xs">
                              YC {company.ycBatch}
                            </Badge>
                          )}
                          {company.isHiring && (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              Hiring
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {company.oneLiner || company.description || 'No description'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {parseTags(company.tags).slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {company.headcount && (
                            <span className="text-xs text-gray-500">
                              {company.headcount} employees
                            </span>
                          )}
                          {company.city && company.state && (
                            <span className="text-xs text-gray-500">
                              {company.city}, {company.state}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        {company.fundingEvents[0] && (
                          <div className="text-sm">
                            <span className="font-medium text-gray-900">
                              {formatAmount(company.fundingEvents[0].amountCents)}
                            </span>
                            <span className="text-gray-500 ml-1">
                              {company.fundingEvents[0].roundType.replace('_', ' ')}
                            </span>
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {company._count.jobPostings > 0 && (
                            <span>{company._count.jobPostings} jobs</span>
                          )}
                          {company._count.people > 0 && (
                            <span className="ml-2">{company._count.people} contacts</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {page * limit + 1} - {Math.min((page + 1) * limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * limit >= total}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
