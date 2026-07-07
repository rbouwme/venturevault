'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

interface ColdEmail {
  id: string
  emailAddress: string
  sentAt: string
  notes: string | null
  followUpStatus: string
  company: {
    id: string
    name: string
    domain: string | null
    oneLiner: string | null
    city: string | null
    state: string | null
    country: string | null
    tags: string | null
    ycBatch: string | null
    ycUrl: string | null
    _count: { people: number }
  }
}

const STATUS_OPTIONS = [
  { value: 'SENT', label: 'Sent', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' },
  { value: 'FOLLOW_UP_1', label: 'Follow-up 1', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' },
  { value: 'FOLLOW_UP_2', label: 'Follow-up 2', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100' },
  { value: 'REPLIED', label: 'Replied', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' },
  { value: 'NO_RESPONSE', label: 'No Response', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100' },
  { value: 'BOUNCED', label: 'Bounced', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' },
]

function getStatusConfig(status: string) {
  return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0]
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function parseTags(tags: string | null): string[] {
  if (!tags) return []
  try { return JSON.parse(tags) } catch { return [] }
}

export function ColdEmailsList() {
  const [emails, setEmails] = useState<ColdEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetchEmails()
  }, [])

  async function fetchEmails() {
    try {
      const res = await fetch('/api/cold-emails')
      if (res.ok) {
        const data = await res.json()
        setEmails(data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id: string, followUpStatus: string) {
    try {
      const res = await fetch(`/api/cold-emails/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followUpStatus }),
      })
      if (res.ok) {
        setEmails(prev => prev.map(e => e.id === id ? { ...e, followUpStatus } : e))
      }
    } catch {
      // ignore
    }
  }

  async function deleteEmail(id: string) {
    try {
      const res = await fetch(`/api/cold-emails/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setEmails(prev => prev.filter(e => e.id !== id))
      }
    } catch {
      // ignore
    }
  }

  const filtered = filter === 'all' ? emails : emails.filter(e => e.followUpStatus === filter)

  // Stats
  const stats = {
    total: emails.length,
    replied: emails.filter(e => e.followUpStatus === 'REPLIED').length,
    pending: emails.filter(e => ['SENT', 'FOLLOW_UP_1', 'FOLLOW_UP_2'].includes(e.followUpStatus)).length,
    bounced: emails.filter(e => e.followUpStatus === 'BOUNCED').length,
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Total Sent</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Replied</p>
            <p className="text-2xl font-bold text-green-600">{stats.replied}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Response Rate</p>
            <p className="text-2xl font-bold">
              {stats.total > 0 ? Math.round((stats.replied / stats.total) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter + Export */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Filter:</span>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({emails.length})
            </Button>
            {STATUS_OPTIONS.map(opt => {
              const count = emails.filter(e => e.followUpStatus === opt.value).length
              if (count === 0) return null
              return (
                <Button
                  key={opt.value}
                  variant={filter === opt.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(opt.value)}
                >
                  {opt.label} ({count})
                </Button>
              )
            })}
          </div>
        </div>
        {emails.length > 0 && (
          <a
            href="/api/export/cold-emails"
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-border bg-background text-foreground hover:bg-accent transition-colors"
          >
            ↓ Export CSV
          </a>
        )}
      </div>

      {/* Email List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium text-muted-foreground">No cold emails logged yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click &quot;Cold Email&quot; on any company card to log an email
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(email => {
            const statusConfig = getStatusConfig(email.followUpStatus)
            const tags = parseTags(email.company.tags)

            return (
              <Card key={email.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <Link href={`/dashboard/companies/${email.company.id}`}>
                        <CardTitle className="text-lg hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          {email.company.name}
                        </CardTitle>
                      </Link>
                      {email.company.domain && (
                        <p className="text-sm text-muted-foreground">{email.company.domain}</p>
                      )}
                    </div>
                    <Badge className={statusConfig.color}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {email.company.oneLiner && (
                      <p className="text-sm text-foreground/80">{email.company.oneLiner}</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Sent to: </span>
                        <span className="font-medium">{email.emailAddress}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Date: </span>
                        <span>{formatDate(email.sentAt)}</span>
                      </div>
                    </div>

                    {email.notes && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Notes: </span>
                        <span>{email.notes}</span>
                      </div>
                    )}

                    {(email.company.city || email.company.state || email.company.country) && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Location: </span>
                        <span>
                          {[email.company.city, email.company.state, email.company.country]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </div>
                    )}

                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Status:</span>
                        <Select
                          value={email.followUpStatus}
                          onValueChange={(value) => updateStatus(email.id, value)}
                        >
                          <SelectTrigger className="h-7 w-[140px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-red-500 hover:text-red-700"
                        onClick={() => deleteEmail(email.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
