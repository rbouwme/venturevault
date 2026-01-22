import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { detectATS } from '@/lib/utils'
import type { CompanyWithRelations } from '@/types'

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
            <p className="text-sm font-medium text-gray-500">Website</p>
            <a
              href={`https://${company.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {company.domain}
            </a>
          </div>
        )}

        {company.linkedinUrl && (
          <div>
            <p className="text-sm font-medium text-gray-500">LinkedIn</p>
            <a
              href={company.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              View Profile
            </a>
          </div>
        )}

        {company.careersUrl && (
          <div>
            <p className="text-sm font-medium text-gray-500">Careers Page</p>
            <a
              href={company.careersUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              View Open Positions
            </a>
          </div>
        )}

        {atsType && (
          <div>
            <p className="text-sm font-medium text-gray-500">ATS Platform</p>
            <p className="text-gray-900">{atsType}</p>
          </div>
        )}

        {company.headcount && (
          <div>
            <p className="text-sm font-medium text-gray-500">Company Size</p>
            <p className="text-gray-900">{company.headcount} employees</p>
          </div>
        )}

        <div>
          <p className="text-sm font-medium text-gray-500">Location</p>
          <p className="text-gray-900">
            {[company.city, company.state, company.country]
              .filter(Boolean)
              .join(', ') || 'Not specified'}
          </p>
        </div>

        {company.tags && company.tags.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-500">Industries</p>
            <p className="text-gray-900">{company.tags.join(', ')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
