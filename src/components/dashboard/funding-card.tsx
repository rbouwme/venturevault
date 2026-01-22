import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatAmount, formatDate, formatRoundType } from '@/lib/utils'
import type { FundingEventWithCompany } from '@/types'

interface FundingCardProps {
  event: FundingEventWithCompany
}

export function FundingCard({ event }: FundingCardProps) {
  const { company } = event
  const isHiring = (company._count?.jobPostings ?? 0) > 0

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Link href={`/dashboard/companies/${company.id}`}>
              <CardTitle className="text-lg hover:text-blue-600 transition-colors">
                {company.name}
              </CardTitle>
            </Link>
            {company.domain && (
              <p className="text-sm text-gray-500">{company.domain}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="secondary">{formatRoundType(event.roundType)}</Badge>
            {isHiring && (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                Hiring
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Amount:</span>
            <span className="font-semibold text-gray-900">
              {event.amountCents ? formatAmount(Number(event.amountCents)) : 'Undisclosed'}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Announced:</span>
            <span className="text-gray-900">{formatDate(event.announcedAt)}</span>
          </div>

          {(company.city || company.state || company.country) && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Location:</span>
              <span className="text-gray-900">
                {[company.city, company.state, company.country]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>
          )}

          {event.investors && event.investors.length > 0 && (
            <div className="text-sm">
              <span className="text-gray-600">Investors: </span>
              <span className="text-gray-900">
                {event.investors.slice(0, 3).join(', ')}
                {event.investors.length > 3 && ` +${event.investors.length - 3} more`}
              </span>
            </div>
          )}

          {event.summary && (
            <p className="text-sm text-gray-600 line-clamp-2">{event.summary}</p>
          )}

          {company.tags && company.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {company.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {event.sourceUrl && (
            <div className="pt-2 border-t">
              <a
                href={event.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                View source article →
              </a>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
