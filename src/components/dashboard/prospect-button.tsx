'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface ProspectButtonProps {
  companyId: string
}

export function ProspectButton({ companyId }: ProspectButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'added' | 'exists'>('idle')

  async function handleClick() {
    if (status === 'added' || status === 'exists') return
    setStatus('loading')

    try {
      const res = await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, priority: 'MEDIUM' }),
      })

      if (res.status === 409) {
        setStatus('exists')
      } else if (res.ok) {
        setStatus('added')
      } else {
        setStatus('idle')
      }
    } catch {
      setStatus('idle')
    }
  }

  if (status === 'added') {
    return (
      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
        Added to Prospects
      </span>
    )
  }

  if (status === 'exists') {
    return (
      <span className="text-xs text-muted-foreground">
        Already a Prospect
      </span>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 text-xs text-muted-foreground hover:text-foreground"
      onClick={handleClick}
      disabled={status === 'loading'}
    >
      {status === 'loading' ? 'Adding...' : '+ Prospect'}
    </Button>
  )
}
