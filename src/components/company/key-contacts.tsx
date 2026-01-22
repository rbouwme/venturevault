'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Person } from '@prisma/client'

interface KeyContactsProps {
  people: Person[]
  companyId: string
  companyDomain?: string | null
}

interface EnrichmentResult {
  success: boolean
  contactsFound: number
  contactsCreated: number
  creditsUsed: number
  remainingCredits: number
  error?: string
}

export function KeyContacts({ people, companyId, companyDomain }: KeyContactsProps) {
  const [contacts, setContacts] = useState<Person[]>(people)
  const [isEnriching, setIsEnriching] = useState(false)
  const [enrichmentError, setEnrichmentError] = useState<string | null>(null)
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null)

  const handleEnrichContacts = async () => {
    setIsEnriching(true)
    setEnrichmentError(null)

    try {
      const response = await fetch(`/api/companies/${companyId}/contacts/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seniorities: ['founder', 'c_suite', 'vp', 'director', 'head'],
          departments: ['engineering', 'human_resources', 'operations'],
          limit: 10,
        }),
      })

      const data: EnrichmentResult = await response.json()

      if (!response.ok || !data.success) {
        setEnrichmentError(data.error || 'Failed to find contacts')
        return
      }

      setRemainingCredits(data.remainingCredits)

      // Refresh contacts list
      const contactsResponse = await fetch(`/api/companies/${companyId}/contacts`)
      if (contactsResponse.ok) {
        const contactsData = await contactsResponse.json()
        setContacts(contactsData.contacts)
      }
    } catch (error) {
      console.error('Enrichment error:', error)
      setEnrichmentError('Failed to enrich contacts')
    } finally {
      setIsEnriching(false)
    }
  }

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email)
  }

  const getEmailStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'VERIFIED':
        return 'bg-green-100 text-green-800'
      case 'UNVERIFIED':
        return 'bg-yellow-100 text-yellow-800'
      case 'INVALID':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeniorityLabel = (seniority: string | null) => {
    if (!seniority) return null
    const labels: Record<string, string> = {
      founder: 'Founder',
      c_level: 'C-Level',
      vp: 'VP',
      director: 'Director',
      manager: 'Manager',
      senior: 'Senior',
      entry: 'Entry Level',
    }
    return labels[seniority] || seniority
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Key Contacts</CardTitle>
        {companyDomain && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEnrichContacts}
                  disabled={isEnriching}
                >
                  {isEnriching ? 'Finding...' : 'Find Contacts'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Search for contacts at this company using Apollo.io</p>
                {remainingCredits !== null && (
                  <p className="text-xs text-gray-400">
                    {remainingCredits} credits remaining this month
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardHeader>
      <CardContent>
        {enrichmentError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {enrichmentError}
          </div>
        )}

        {contacts.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-600 mb-3">No contacts found yet.</p>
            {companyDomain && (
              <Button
                variant="default"
                size="sm"
                onClick={handleEnrichContacts}
                disabled={isEnriching}
              >
                {isEnriching ? 'Searching...' : 'Find Contacts'}
              </Button>
            )}
            {!companyDomain && (
              <p className="text-sm text-gray-500">
                Company domain needed to search for contacts.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {contacts.map((person) => (
              <div
                key={person.id}
                className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{person.name}</p>
                    {person.seniority && (
                      <Badge variant="secondary" className="text-xs">
                        {getSeniorityLabel(person.seniority)}
                      </Badge>
                    )}
                  </div>
                  {(person.title || person.role) && (
                    <p className="text-sm text-gray-600">
                      {person.title || person.role}
                    </p>
                  )}
                  {person.department && (
                    <p className="text-xs text-gray-500 capitalize">
                      {person.department}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {person.email && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => copyEmail(person.email!)}
                              className="text-sm text-gray-700 hover:text-blue-600 flex items-center gap-1"
                            >
                              <span className="truncate max-w-[180px]">
                                {person.email}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-xs ${getEmailStatusColor(
                                  person.emailStatus
                                )}`}
                              >
                                {person.emailStatus === 'VERIFIED' ? '✓' : '?'}
                              </Badge>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Click to copy email</p>
                            <p className="text-xs text-gray-400">
                              Status: {person.emailStatus}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {person.linkedinUrl && (
                      <a
                        href={person.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        LinkedIn
                      </a>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {person.source.replace('_', ' ')}
                    </Badge>
                    {person.confidence !== null && person.confidence > 0 && (
                      <span className="text-xs text-gray-400">
                        {Math.round(person.confidence * 100)}% confidence
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {remainingCredits !== null && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Apollo.io credits remaining: {remainingCredits}/50 this month
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
