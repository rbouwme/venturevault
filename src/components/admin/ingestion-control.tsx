'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

const SOURCES = [
  { value: 'all', label: 'All Sources' },
  { value: 'techcrunch', label: 'TechCrunch' },
  { value: 'venturebeat', label: 'VentureBeat' },
]

export function IngestionControl() {
  const [source, setSource] = useState('all')
  const [isRunning, setIsRunning] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const handleRunIngestion = async () => {
    setIsRunning(true)
    setStatus('Starting ingestion...')

    try {
      const response = await fetch('/api/admin/ingestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: source === 'all' ? null : source }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus(`Completed: ${data.itemsProcessed} items processed`)
        toast.success('Ingestion completed successfully')
      } else {
        setStatus(`Error: ${data.error}`)
        toast.error(data.error || 'Ingestion failed')
      }
    } catch (error) {
      setStatus('Error: Network failure')
      toast.error('Failed to run ingestion')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Ingestion</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Manually trigger data ingestion from RSS feeds. This will fetch the
            latest funding announcements and add them to the database.
          </p>

          <div className="flex items-end gap-4">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium text-gray-700">
                Source
              </label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleRunIngestion} disabled={isRunning}>
              {isRunning ? 'Running...' : 'Run Ingestion'}
            </Button>
          </div>

          {status && (
            <div
              className={`p-3 rounded-lg text-sm ${
                status.startsWith('Error')
                  ? 'bg-red-50 text-red-700'
                  : status.startsWith('Completed')
                  ? 'bg-green-50 text-green-700'
                  : 'bg-blue-50 text-blue-700'
              }`}
            >
              {status}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
