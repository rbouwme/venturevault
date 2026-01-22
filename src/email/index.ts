import { Resend } from 'resend'
import { AlertNotificationEmail } from './templates/alert-notification'
import { render } from '@react-email/components'
import React from 'react'

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return null
  }
  return new Resend(apiKey)
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'notifications@startup-tracker.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

interface FundingMatch {
  companyName: string
  companyId: string
  roundType: string
  amount?: string
  announcedAt: string
  sourceUrl?: string
}

export async function sendAlertNotification(
  to: string,
  alertName: string,
  matches: FundingMatch[]
): Promise<boolean> {
  const resend = getResendClient()

  if (!resend) {
    console.log('Resend API key not configured, skipping email')
    return false
  }

  try {
    const emailComponent = React.createElement(AlertNotificationEmail, {
      alertName,
      matches,
      appUrl: APP_URL,
    })

    const html = await render(emailComponent)

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `[Funding Alert] ${matches.length} new match${matches.length > 1 ? 'es' : ''} for "${alertName}"`,
      html,
    })

    if (error) {
      console.error('Failed to send email:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Email send error:', error)
    return false
  }
}
