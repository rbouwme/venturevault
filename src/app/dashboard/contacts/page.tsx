import { ContactsList } from '@/components/contacts/contacts-list'

export default function ContactsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Startups with Contacts</h1>
        <p className="text-muted-foreground">
          Companies that have available contact information for key people
        </p>
      </div>

      <ContactsList />
    </div>
  )
}
