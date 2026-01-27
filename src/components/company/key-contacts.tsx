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
import { AddContactModal } from './add-contact-modal'
import type { Person } from '@prisma/client'

interface KeyContactsProps {
  people: Person[]
  companyId: string
  companyName: string
  companyDomain?: string | null
}

export function KeyContacts({ people, companyId, companyName, companyDomain }: KeyContactsProps) {
  const [contacts, setContacts] = useState<Person[]>(people)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isFinding, setIsFinding] = useState(false)
  const [findResult, setFindResult] = useState<string | null>(null)
  const [serviceStatus, setServiceStatus] = useState<string | null>(null)

  const refreshContacts = async () => {
    try {
      const response = await fetch(`/api/companies/${companyId}/contacts`)
      if (response.ok) {
        const data = await response.json()
        setContacts(data.contacts)
      }
    } catch (error) {
      console.error('Failed to refresh contacts:', error)
    }
  }

  const handleFindContacts = async () => {
    setIsFinding(true)
    setFindResult(null)
    setServiceStatus(null)

    try {
      const response = await fetch(`/api/companies/${companyId}/contacts/find`, {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setFindResult(data.message)

        // Show service status
        if (data.availableServices) {
          const services = data.availableServices
          const statusParts = []

          if (services.apollo?.configured) {
            statusParts.push(`Apollo: ${services.apollo.credits}/${services.apollo.limit} credits`)
          }
          if (services.hunter?.configured) {
            statusParts.push(`Hunter: ${services.hunter.credits}/${services.hunter.limit} credits`)
          }
          if (services.snovio?.configured) {
            statusParts.push(`Snov.io: ${services.snovio.credits}/${services.snovio.limit} credits`)
          }

          if (statusParts.length > 0) {
            setServiceStatus(statusParts.join(' • '))
          }
        }

        await refreshContacts()
      } else {
        setFindResult(data.message || data.error || 'Failed to find contacts')

        // Show why it failed (no credits, etc.)
        if (data.availableServices) {
          const services = data.availableServices
          const noCredits = []

          if (services.apollo?.configured && services.apollo.credits === 0) {
            noCredits.push('Apollo')
          }
          if (services.hunter?.configured && services.hunter.credits === 0) {
            noCredits.push('Hunter')
          }
          if (services.snovio?.configured && services.snovio.credits === 0) {
            noCredits.push('Snov.io')
          }

          if (noCredits.length > 0) {
            setServiceStatus(`Out of credits: ${noCredits.join(', ')}`)
          }
        }
      }
    } catch (error) {
      console.error('Find contacts error:', error)
      setFindResult('Failed to find contacts')
    } finally {
      setIsFinding(false)
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

  const getConfidenceColor = (confidence: number | null) => {
    if (!confidence) return 'text-gray-400 dark:text-gray-500'
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400'
    if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-orange-600 dark:text-orange-400'
  }

  const getConfidenceLabel = (confidence: number | null, source: string) => {
    if (!confidence) return source
    const percent = Math.round(confidence * 100)
    if (confidence >= 0.8) return `${source} (${percent}% confident)`
    if (confidence >= 0.6) return `${source} (${percent}% likely)`
    return `${source} (${percent}% guess)`
  }

  return (
    <>
      <AddContactModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        companyId={companyId}
        companyName={companyName}
        companyDomain={companyDomain}
        onContactAdded={refreshContacts}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Key Contacts</CardTitle>
          <div className="flex gap-2">
            {companyDomain && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleFindContacts}
                      disabled={isFinding}
                    >
                      {isFinding ? 'Finding...' : 'Find Contacts'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Automatically find contacts from company website</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsModalOpen(true)}
                  >
                    Add Contact
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add a contact manually</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          {findResult && (
            <div className="mb-4 space-y-2">
              <div className={`p-3 rounded-lg text-sm ${
                findResult.includes('Failed') || findResult.includes('error') || findResult.includes('No contacts')
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                  : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
              }`}>
                {findResult}
              </div>
              {serviceStatus && (
                <div className="text-xs text-muted-foreground px-3">
                  {serviceStatus}
                </div>
              )}
            </div>
          )}
          {contacts.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-600 dark:text-gray-400 mb-3">No contacts found yet.</p>
              <div className="flex gap-2 justify-center">
                {companyDomain && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleFindContacts}
                    disabled={isFinding}
                  >
                    {isFinding ? 'Finding...' : 'Find Contacts'}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(true)}
                >
                  Add Manually
                </Button>
              </div>
            </div>
          ) : (
          <div className="space-y-4">
            {contacts.map((person) => (
              <div
                key={person.id}
                className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{person.name}</p>
                    {person.seniority && (
                      <Badge variant="secondary" className="text-xs">
                        {getSeniorityLabel(person.seniority)}
                      </Badge>
                    )}
                  </div>
                  {(person.title || person.role) && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {person.title || person.role}
                    </p>
                  )}
                  {person.department && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 capitalize">
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
                              className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
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
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getConfidenceColor(person.confidence)}`}
                          >
                            {getConfidenceLabel(person.confidence, person.source.replace('_', ' '))}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            Source: {person.source.toUpperCase()}
                            {person.confidence && (
                              <> | Confidence: {Math.round(person.confidence * 100)}%</>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {person.confidence && person.confidence < 0.7 &&
                              'Low confidence - verify before use'}
                            {person.confidence && person.confidence >= 0.7 && person.confidence < 0.9 &&
                              'Moderate confidence - may need verification'}
                            {person.confidence && person.confidence >= 0.9 &&
                              'High confidence - likely accurate'}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    </>
  )
}
