import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Heading,
} from '@react-email/components'
import * as React from 'react'

interface FundingMatch {
  companyName: string
  companyId: string
  roundType: string
  amount?: string
  announcedAt: string
  sourceUrl?: string
}

interface AlertNotificationEmailProps {
  alertName: string
  matches: FundingMatch[]
  appUrl: string
}

export function AlertNotificationEmail({
  alertName,
  matches,
  appUrl,
}: AlertNotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Startup Funding Tracker</Heading>
          <Text style={text}>
            Your alert <strong>{alertName}</strong> found {matches.length} new
            funding event{matches.length > 1 ? 's' : ''}.
          </Text>

          <Section style={section}>
            {matches.map((match, index) => (
              <React.Fragment key={index}>
                <div style={eventCard}>
                  <Text style={companyName}>
                    <Link
                      href={`${appUrl}/dashboard/companies/${match.companyId}`}
                      style={link}
                    >
                      {match.companyName}
                    </Link>
                  </Text>
                  <Text style={eventDetails}>
                    <strong>{match.roundType}</strong>
                    {match.amount && ` - ${match.amount}`}
                  </Text>
                  <Text style={eventDate}>Announced: {match.announcedAt}</Text>
                  {match.sourceUrl && (
                    <Text style={sourceLink}>
                      <Link href={match.sourceUrl} style={link}>
                        View source →
                      </Link>
                    </Text>
                  )}
                </div>
                {index < matches.length - 1 && <Hr style={hr} />}
              </React.Fragment>
            ))}
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            <Link href={`${appUrl}/dashboard/settings`} style={link}>
              Manage your alerts
            </Link>
            {' | '}
            <Link href={appUrl} style={link}>
              Go to Dashboard
            </Link>
          </Text>

          <Text style={footerNote}>
            You received this email because you have an active alert on Startup
            Funding Tracker.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.25',
  margin: '16px 24px',
}

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 24px',
}

const section = {
  margin: '24px',
}

const eventCard = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '12px',
}

const companyName = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 8px 0',
}

const eventDetails = {
  color: '#374151',
  fontSize: '14px',
  margin: '0 0 4px 0',
}

const eventDate = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0 0 8px 0',
}

const sourceLink = {
  margin: '0',
}

const link = {
  color: '#2563eb',
  textDecoration: 'none',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
}

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '16px 24px',
}

const footerNote = {
  color: '#9ca3af',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '16px 24px',
}

export default AlertNotificationEmail
