export type IngestionStatus = 'RUNNING' | 'COMPLETED' | 'FAILED'

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'

export type RoundType =
  | 'PRE_SEED'
  | 'SEED'
  | 'SERIES_A'
  | 'SERIES_B'
  | 'SERIES_C'
  | 'SERIES_D'
  | 'SERIES_E_PLUS'
  | 'BRIDGE'
  | 'DEBT'
  | 'GRANT'
  | 'IPO'
  | 'ACQUISITION'
  | 'UNKNOWN'

export type OutreachType =
  | 'EMAIL'
  | 'COLD_EMAIL'
  | 'LINKEDIN'
  | 'LINKEDIN_MESSAGE'
  | 'INTRODUCTION_REQUEST'
  | 'TWITTER'
  | 'PHONE'
  | 'OTHER'

export type OutreachStatus =
  | 'DRAFT'
  | 'SENT'
  | 'OPENED'
  | 'REPLIED'
  | 'RESPONDED'
  | 'NO_RESPONSE'
  | 'BOUNCED'
  | 'UNSUBSCRIBED'
