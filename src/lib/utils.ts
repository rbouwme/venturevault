import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAmount(amountCents: number): string {
  const amount = amountCents / 100
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(1)}B`
  }
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`
  }
  return `$${amount.toLocaleString()}`
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatRoundType(roundType: string): string {
  return roundType
    .replace(/_/g, ' ')
    .replace(/PLUS/g, '+')
    .split(' ')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}

export function detectATS(careersUrl: string): string | null {
  const url = careersUrl.toLowerCase()
  if (url.includes('greenhouse.io')) return 'Greenhouse'
  if (url.includes('lever.co')) return 'Lever'
  if (url.includes('workable.com')) return 'Workable'
  if (url.includes('jobs.ashbyhq.com')) return 'Ashby'
  if (url.includes('myworkdayjobs.com')) return 'Workday'
  if (url.includes('bamboohr.com')) return 'BambooHR'
  if (url.includes('icims.com')) return 'iCIMS'
  return null
}

export function isHiringNow(jobPostings: { postedAt: Date }[]): boolean {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  return jobPostings.some((job) => new Date(job.postedAt) >= thirtyDaysAgo)
}
