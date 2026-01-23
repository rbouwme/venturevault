import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { detectATS } from '@/lib/utils'
import type { CompanyWithRelations } from '@/types'

function parseTags(tags: string | string[] | null): string[] {
  if (!tags) return []
  if (Array.isArray(tags)) return tags
  try {
    return JSON.parse(tags)
  } catch {
    return []
  }
}

interface CompanyProfileProps {
  company: CompanyWithRelations
}

export function CompanyProfile({ company }: CompanyProfileProps) {
  const atsType = company.careersUrl ? detectATS(company.careersUrl) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {company.domain && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Website</p>
            <a
              href={`https://${company.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              {company.domain}
            </a>
          </div>
        )}

        {company.linkedinUrl && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">LinkedIn</p>
            <a
              href={company.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              View Profile
            </a>
          </div>
        )}

        {company.careersUrl && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Careers Page</p>
            <a
              href={company.careersUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              View Open Positions
            </a>
          </div>
        )}

        {atsType && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">ATS Platform</p>
            <p className="text-foreground">{atsType}</p>
          </div>
        )}

        {company.headcount && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Company Size</p>
            <p className="text-foreground">{company.headcount} employees</p>
          </div>
        )}

        <div>
          <p className="text-sm font-medium text-muted-foreground">Location</p>
          <p className="text-foreground">
            {[company.city, company.state, company.country]
              .filter(Boolean)
              .join(', ') || 'Not specified'}
          </p>
        </div>

        {parseTags(company.tags).length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Industries</p>
            <p className="text-foreground">{parseTags(company.tags).join(', ')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
