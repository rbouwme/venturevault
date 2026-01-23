import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatAmount, formatDate, formatRoundType } from '@/lib/utils'

interface FundingCardProps {
  event: {
    id: string
    companyId: string
    roundType: string
    amountCents: string | bigint | null
    announcedAt: string | Date
    investors: string | string[] | null
    leadInvestor?: string | null
    summary: string | null
    sourceUrl: string | null
    sourceName: string | null
    company: {
      id: string
      name: string
      domain: string | null
      description: string | null
      country: string | null
      state: string | null
      city: string | null
      logoUrl: string | null
      tags: string | string[] | null
      isHiring?: boolean
      oneLiner?: string | null
      ycBatch?: string | null
      _count?: {
        jobPostings?: number
      }
    }
  }
}

function parseTags(tags: string | string[] | null): string[] {
  if (!tags) return []
  if (Array.isArray(tags)) return tags
  try {
    return JSON.parse(tags)
  } catch {
    return []
  }
}

function parseInvestors(investors: string | string[] | null): string[] {
  if (!investors) return []
  if (Array.isArray(investors)) return investors
  try {
    return JSON.parse(investors)
  } catch {
    return []
  }
}

export function FundingCard({ event }: FundingCardProps) {
  const { company } = event
  const isHiring = company.isHiring || (company._count?.jobPostings ?? 0) > 0
  const tags = parseTags(company.tags)
  const investors = parseInvestors(event.investors)
  const isYCCompany = event.roundType?.startsWith('YC ')

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Link href={`/dashboard/companies/${company.id}`}>
              <CardTitle className="text-lg hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                {company.name}
              </CardTitle>
            </Link>
            {company.domain && (
              <p className="text-sm text-muted-foreground">{company.domain}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={isYCCompany ? "default" : "secondary"} className={isYCCompany ? "bg-orange-500 dark:bg-orange-600" : ""}>
              {formatRoundType(event.roundType)}
            </Badge>
            {isHiring && (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100 dark:hover:bg-green-900">
                Hiring
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {!isYCCompany && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-semibold text-foreground">
                {event.amountCents ? formatAmount(Number(event.amountCents)) : 'Undisclosed'}
              </span>
            </div>
          )}

          {company.oneLiner && (
            <p className="text-sm text-foreground/80 font-medium">{company.oneLiner}</p>
          )}

          {(company.city || company.state || company.country) && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Location:</span>
              <span className="text-foreground">
                {[company.city, company.state, company.country]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>
          )}

          {investors.length > 0 && (
            <div className="text-sm">
              <span className="text-muted-foreground">Investors: </span>
              <span className="text-foreground">
                {investors.slice(0, 3).join(', ')}
                {investors.length > 3 && ` +${investors.length - 3} more`}
              </span>
            </div>
          )}

          {event.summary && !company.oneLiner && (
            <p className="text-sm text-muted-foreground line-clamp-2">{event.summary}</p>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {event.sourceUrl && (
            <div className="pt-2 border-t border-border">
              <a
                href={event.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
              >
                {isYCCompany ? 'View on Y Combinator →' : 'View source article →'}
              </a>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
