import type {
  Company,
  FundingEvent,
  JobPosting,
  Person,
  OutreachDraft,
  User,
  Watchlist,
  SavedSearch,
  Alert,
  IngestionRun,
  IngestionLog,
} from '@prisma/client'

// Company with relations
export type CompanyWithFunding = Company & {
  fundingEvents: FundingEvent[]
}

export type CompanyWithRelations = Company & {
  fundingEvents: FundingEvent[]
  jobPostings: JobPosting[]
  people: Person[]
  _count?: {
    jobPostings: number
    fundingEvents: number
    people: number
  }
}

export type CompanyWithHiringStatus = Company & {
  fundingEvents: FundingEvent[]
  jobPostings: { id: string; postedAt: Date }[]
  isHiring?: boolean
}

// Funding event with company
export type FundingEventWithCompany = FundingEvent & {
  company: Company & {
    _count?: {
      jobPostings: number
    }
  }
}

export type FundingEventWithCompanyAndJobs = FundingEvent & {
  company: CompanyWithHiringStatus
}

// Outreach with relations
export type OutreachDraftWithCompany = OutreachDraft & {
  company: Company
}

// Watchlist with company
export type WatchlistWithCompany = Watchlist & {
  company: CompanyWithFunding
}

// Ingestion run with logs
export type IngestionRunWithLogs = IngestionRun & {
  logs: IngestionLog[]
}

// Filter types
export interface FundingFilters {
  search?: string
  roundType?: string
  country?: string
  state?: string
  city?: string
  metro?: string
  industry?: string
  minAmount?: number
  maxAmount?: number
  startDate?: string
  endDate?: string
  hiringNow?: boolean
  sortBy?: 'newest' | 'amount'
  page?: number
  limit?: number
}

// API response types
export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface ApiError {
  error: string
  details?: string
}

// Session user type extension
export interface SessionUser {
  id: string
  email: string
  name?: string | null
  role: 'USER' | 'ADMIN'
}

// Re-export Prisma types
export type {
  Company,
  FundingEvent,
  JobPosting,
  Person,
  OutreachDraft,
  User,
  Watchlist,
  SavedSearch,
  Alert,
  IngestionRun,
  IngestionLog,
}
