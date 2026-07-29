'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import type { CompanyWithRelations } from '@/types'
import type { OutreachType } from '@/types/enums'

interface OutreachHelperProps {
  company: CompanyWithRelations
}

const OUTREACH_TYPES: { value: OutreachType; label: string }[] = [
  { value: 'COLD_EMAIL', label: 'Cold Email' },
  { value: 'LINKEDIN_MESSAGE', label: 'LinkedIn DM' },
  { value: 'INTRODUCTION_REQUEST', label: 'Warm Intro' },
]

export function OutreachHelper({ company }: OutreachHelperProps) {
  const { data: session } = useSession()
  const [activeType, setActiveType] = useState<OutreachType>('COLD_EMAIL')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedDraft, setGeneratedDraft] = useState<{
    subject?: string
    body: string
  } | null>(null)

  const handleGenerate = async () => {
    if (!session?.user) {
      toast.error('Please sign in to generate outreach')
      return
    }

    setIsGenerating(true)
    setGeneratedDraft(null)

    try {
      const response = await fetch('/api/outreach/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          type: activeType,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setGeneratedDraft(data.draft)
        toast.success('Draft generated successfully')
      } else {
        toast.error(data.error || 'Failed to generate draft')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!generatedDraft) return

    try {
      const response = await fetch('/api/outreach/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          type: activeType,
          subject: generatedDraft.subject,
          body: generatedDraft.body,
        }),
      })

      if (response.ok) {
        toast.success('Draft saved to outreach')
      } else {
        toast.error('Failed to save draft')
      }
    } catch {
      toast.error('Something went wrong')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outreach Helper</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeType}
          onValueChange={(v) => {
            setActiveType(v as OutreachType)
            setGeneratedDraft(null)
          }}
        >
          <TabsList className="grid w-full grid-cols-3">
            {OUTREACH_TYPES.map((type) => (
              <TabsTrigger key={type.value} value={type.value}>
                {type.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {OUTREACH_TYPES.map((type) => (
            <TabsContent key={type.value} value={type.value} className="space-y-4">
              <p className="text-sm text-gray-600">
                {type.value === 'COLD_EMAIL' &&
                  'Generate a professional cold email introducing yourself and your interest in the company.'}
                {type.value === 'LINKEDIN_MESSAGE' &&
                  'Generate a concise LinkedIn message (<100 words) to connect with key contacts.'}
                {type.value === 'INTRODUCTION_REQUEST' &&
                  'Generate an email requesting an introduction from a mutual connection.'}
              </p>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? 'Generating...' : 'Generate Draft'}
              </Button>

              {generatedDraft && (
                <div className="space-y-4 mt-4">
                  {generatedDraft.subject && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700">Subject</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(generatedDraft.subject!)}
                        >
                          Copy
                        </Button>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg text-sm">
                        {generatedDraft.subject}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700">Message</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(generatedDraft.body)}
                      >
                        Copy
                      </Button>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap">
                      {generatedDraft.body}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleSaveDraft}
                    className="w-full"
                  >
                    Save to Outreach
                  </Button>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
