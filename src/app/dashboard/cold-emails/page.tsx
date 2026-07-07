import { ColdEmailsList } from '@/components/cold-emails/cold-emails-list'

export default function ColdEmailsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cold Emails</h1>
        <p className="text-muted-foreground">
          Track cold emails sent to startups and their follow-up status
        </p>
      </div>

      <ColdEmailsList />
    </div>
  )
}
