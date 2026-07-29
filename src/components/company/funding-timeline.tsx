import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatAmount, formatDate, formatRoundType } from '@/lib/utils'
import type { FundingEvent } from '@prisma/client'

interface FundingTimelineProps {
  events: FundingEvent[]
}

export function FundingTimeline({ events }: FundingTimelineProps) {
  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funding Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-center py-4">
            No funding events recorded yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funding Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-6">
            {events.map((event, index) => (
              <div key={event.id} className="relative pl-10">
                <div
                  className={`absolute left-2.5 w-3 h-3 rounded-full ${
                    index === 0 ? 'bg-blue-600' : 'bg-gray-400'
                  }`}
                />

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant={index === 0 ? 'default' : 'secondary'}>
                      {formatRoundType(event.roundType)}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {formatDate(event.announcedAt)}
                    </span>
                  </div>

                  {event.amountCents && (
                    <p className="text-lg font-semibold text-gray-900">
                      {formatAmount(Number(event.amountCents))}
                    </p>
                  )}

                  {event.investors && event.investors.length > 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                      <span className="font-medium">Investors:</span>{' '}
                      {(typeof event.investors === 'string' ? JSON.parse(event.investors) as string[] : event.investors as string[]).join(', ')}
                    </p>
                  )}

                  {event.summary && (
                    <p className="text-sm text-gray-600 mt-2">{event.summary}</p>
                  )}

                  {event.sourceUrl && (
                    <a
                      href={event.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                    >
                      View source →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
