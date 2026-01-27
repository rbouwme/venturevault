'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react'

interface CreditInfo {
  provider: string
  used: number
  limit: number
  remaining: number
  resetDate: Date
  configured: boolean
}

export function CreditsDashboard() {
  const [credits, setCredits] = useState<CreditInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCredits()
  }, [])

  const fetchCredits = async () => {
    try {
      const response = await fetch('/api/credits')
      if (!response.ok) throw new Error('Failed to fetch credits')

      const data = await response.json()
      setCredits(data.credits)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load credits')
    } finally {
      setLoading(false)
    }
  }

  const getProviderName = (provider: string) => {
    const names: Record<string, string> = {
      APOLLO: 'Apollo.io',
      HUNTER: 'Hunter.io',
      SNOVIO: 'Snov.io',
      NEWSAPI: 'NewsAPI',
    }
    return names[provider] || provider
  }

  const getProviderDescription = (provider: string) => {
    const descriptions: Record<string, string> = {
      APOLLO: 'Automatically discovers key contacts at companies including founders, executives, and decision makers with verified email addresses and LinkedIn profiles.',
      HUNTER: 'Finds and verifies professional email addresses from company domains. Great for reaching out to specific people at startups.',
      SNOVIO: 'Enriches company data with employee contacts and email addresses. Helps you build targeted outreach lists for promising startups.',
      NEWSAPI: 'Fetches recent news articles and funding announcements about companies. Powers the funding feed and company insights.',
    }
    return descriptions[provider] || ''
  }

  const getUsageColor = (used: number, limit: number) => {
    const percentage = (used / limit) * 100
    if (percentage >= 90) return 'text-red-600 dark:text-red-400'
    if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }

  const formatResetDate = (date: Date) => {
    const resetDate = new Date(date)
    const now = new Date()
    const diffDays = Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Resets today'
    if (diffDays === 1) return 'Resets tomorrow'
    return `Resets in ${diffDays} days`
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Credits</CardTitle>
          <CardDescription>Loading credit status...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Credits</CardTitle>
          <CardDescription className="text-red-600">
            <AlertCircle className="inline mr-1 h-4 w-4" />
            {error}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Credits</CardTitle>
        <CardDescription>
          Monitor your API usage across enrichment services. Credits reset monthly (NewsAPI resets daily).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {credits.map((credit) => {
            const percentage = (credit.used / credit.limit) * 100

            return (
              <div key={credit.provider} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{getProviderName(credit.provider)}</h4>
                      {credit.configured ? (
                        <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Configured
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800">
                          <XCircle className="mr-1 h-3 w-3" />
                          API Key Not Yet Configured
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getProviderDescription(credit.provider)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${getUsageColor(credit.used, credit.limit)}`}>
                      {credit.remaining} / {credit.limit}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatResetDate(credit.resetDate)}
                    </p>
                  </div>
                </div>

                <Progress
                  value={percentage}
                  className="h-2"
                />

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{credit.used} used</span>
                  <span>{percentage.toFixed(0)}% consumed</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Configuration Help */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Need API Keys?</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Apollo.io: Get 50 free credits/month at <a href="https://apollo.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">apollo.io</a></li>
            <li>• Hunter.io: Get 25 free searches/month at <a href="https://hunter.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">hunter.io</a></li>
            <li>• Snov.io: Get 50 free credits/month at <a href="https://snov.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">snov.io</a></li>
            <li>• NewsAPI: Get 500 free requests/day at <a href="https://newsapi.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">newsapi.org</a></li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3">
            Add API keys to your <code className="px-1 py-0.5 bg-muted rounded">.env.local</code> file to enable these services.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
