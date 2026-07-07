'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Person {
  id: string
  name: string
  role: string | null
  title: string | null
  email: string | null
  linkedinUrl: string | null
}

interface CompanyWithContacts {
  id: string
  name: string
  domain: string | null
  city: string | null
  state: string | null
  country: string | null
  oneLiner: string | null
  description: string | null
  logoUrl: string | null
  tags: string | null
  isHiring: boolean
  ycBatch: string | null
  people: Person[]
  _count: {
    people: number
  }
  fundingEvents: Array<{
    roundType: string
    amountCents: string | bigint | null
    announcedAt: string
  }>
}

interface ContactsResponse {
  companies: CompanyWithContacts[]
  totalCount: number
  totalPages: number
  currentPage: number
}

function ListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card rounded-lg border border-border p-6 space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-4 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ContactsList() {
  const [data, setData] = useState<ContactsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('contacts')

  useEffect(() => {
    async function fetchCompanies() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20',
          sortBy,
        })
        const res = await fetch(`/api/companies/with-contacts?${params}`)
        if (!res.ok) throw new Error('Failed to fetch')
        const result = await res.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }
    fetchCompanies()
  }, [page, sortBy])

  if (loading) return <ListSkeleton />

  if (error) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <div className="text-4xl mb-4">❌</div>
        <h3 className="text-lg font-semibold text-foreground">Error loading contacts</h3>
        <p className="mt-2 text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (!data || data.companies.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <div className="text-4xl mb-4">👤</div>
        <h3 className="text-lg font-semibold text-foreground">No contacts found</h3>
        <p className="mt-2 text-muted-foreground">
          Contacts are discovered automatically when you configure enrichment API keys in Settings.
          Once configured, the system will find key people at companies you&apos;re tracking.
        </p>
        <Link href="/dashboard/settings">
          <Button className="mt-4">Go to Settings</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data.totalCount} {data.totalCount === 1 ? 'startup' : 'startups'} with contacts
        </p>
        <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1) }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contacts">Most contacts</SelectItem>
            <SelectItem value="name">Company name</SelectItem>
            <SelectItem value="newest">Recently updated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data.companies.map((company) => (
        <Card key={company.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <Link href={`/dashboard/companies/${company.id}`}>
                  <CardTitle className="text-lg hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {company.name}
                  </CardTitle>
                </Link>
                {company.domain && (
                  <p className="text-sm text-muted-foreground">{company.domain}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                  {company._count.people} {company._count.people === 1 ? 'contact' : 'contacts'}
                </Badge>
                {company.ycBatch && (
                  <Badge className="bg-orange-500 dark:bg-orange-600">
                    YC {company.ycBatch}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {company.oneLiner && (
                <p className="text-sm text-foreground/80">{company.oneLiner}</p>
              )}

              {(company.city || company.state || company.country) && (
                <div className="text-sm text-muted-foreground">
                  {[company.city, company.state, company.country].filter(Boolean).join(', ')}
                </div>
              )}

              <div className="border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Contacts</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {company.people.slice(0, 4).map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center gap-2 text-sm bg-muted/50 rounded-md px-3 py-2"
                    >
                      <span className="text-muted-foreground">👤</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{person.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {person.title || person.role || 'No title'}
                          {person.email && ' • ✉️'}
                          {person.linkedinUrl && ' • in'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {company._count.people > 4 && (
                  <Link
                    href={`/dashboard/companies/${company.id}`}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
                  >
                    +{company._count.people - 4} more contacts →
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {data.currentPage} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
