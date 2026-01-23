'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  openaiKeyEncrypted: string | null
  linkedinUrl: string | null
}

interface SettingsFormProps {
  user: User
}

export function SettingsForm({ user }: SettingsFormProps) {
  const [name, setName] = useState(user.name || '')
  const [linkedinUrl, setLinkedinUrl] = useState(user.linkedinUrl || '')
  const [openaiKey, setOpenaiKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || undefined,
          linkedinUrl: linkedinUrl || undefined,
          openaiKey: openaiKey || undefined,
        }),
      })

      if (response.ok) {
        toast.success('Settings updated')
        setOpenaiKey('')
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to update settings')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedinUrl">LinkedIn Profile</Label>
            <Input
              id="linkedinUrl"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/your-profile"
            />
            <p className="text-xs text-muted-foreground">
              Link your LinkedIn profile to enhance your job search experience.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="openaiKey">OpenAI API Key</Label>
            <Input
              id="openaiKey"
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder={user.openaiKeyEncrypted ? '••••••••••••••••' : 'Enter your API key'}
            />
            <p className="text-xs text-muted-foreground">
              Your API key is encrypted and stored securely. Required for AI outreach generation.
            </p>
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
