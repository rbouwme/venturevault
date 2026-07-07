import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatAmount, formatDate, formatRoundType } from '@/lib/utils'
import { ProspectButton } from './prospect-button'
import { ColdEmailButton } from './cold-email-button'
import { EmailedBadge, type ColdEmailRecord } from './emailed-badge'

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
        people?: number
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

export function FundingCard({ event, coldEmail }: FundingCardProps & { coldEmail?: ColdEmailRecord }) {
  const { company } = event
  const isHiring = company.isHiring || (company._count?.jobPostings ?? 0) > 0
  const tags = parseTags(company.tags)
  const investors = parseInvestors(event.investors)
  const isYCCompany = event.roundType?.startsWith('YC ')

  return (
    <Card className="hover:border-border/80 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Link href={`/dashboard/companies/${company.id}`}>
              <CardTitle className="text-base hover:text-primary transition-colors">
                {company.name}
              </CardTitle>
            </Link>
            {coldEmail && <EmailedBadge coldEmail={coldEmail} />}
            {company.domain && (
              <p className="text-sm text-muted-foreground">{company.domain}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={isYCCompany ? "default" : "secondary"} className={isYCCompany ? "bg-orange-500 text-white dark:bg-orange-600" : ""}>
              {formatRoundType(event.roundType)}
            </Badge>
            {isHiring && (
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 dark:hover:bg-emerald-950">
                Hiring
              </Badge>
            )}
            {(company._count?.people ?? 0) > 0 && (
              <Badge variant="secondary" className="bg-primary/8 text-primary hover:bg-primary/8 dark:bg-primary/15 dark:text-primary dark:hover:bg-primary/15">
                {company._count!.people} {company._count!.people === 1 ? 'contact' : 'contacts'}
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

          <div className="pt-2 border-t border-border flex items-center justify-between">
            {event.sourceUrl ? (
              <a
                href={event.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:text-primary/80 hover:underline"
              >
                {isYCCompany ? 'View on Y Combinator →' : 'View source article →'}
              </a>
            ) : <span />}
            <div className="flex items-center gap-1">
              <ColdEmailButton companyId={company.id} companyName={company.name} />
              <ProspectButton companyId={company.id} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
