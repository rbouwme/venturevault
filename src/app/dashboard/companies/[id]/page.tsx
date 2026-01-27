import { notFound } from 'next/navigation'
import { getCompanyById } from '@/services/funding'
import { CompanyHeader } from '@/components/company/company-header'
import { FundingTimeline } from '@/components/company/funding-timeline'
import { CompanyProfile } from '@/components/company/company-profile'
import { OpenRoles } from '@/components/company/open-roles'
import { KeyContacts } from '@/components/company/key-contacts'
import { OutreachHelper } from '@/components/company/outreach-helper'

interface CompanyPageProps {
  params: Promise<{ id: string }>
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { id } = await params
  const company = await getCompanyById(id)

  if (!company) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <CompanyHeader company={company} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <FundingTimeline events={company.fundingEvents} />
          <OpenRoles jobs={company.jobPostings} careersUrl={company.careersUrl} />
        </div>

        <div className="space-y-6">
          <CompanyProfile company={company} />
          <KeyContacts
            people={company.people}
            companyId={company.id}
            companyName={company.name}
            companyDomain={company.domain}
          />
          <OutreachHelper company={company} />
        </div>
      </div>
    </div>
  )
}
