'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const errorMessages: Record<string, string> = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'You do not have permission to access this resource.',
  Verification: 'The verification link has expired or has already been used.',
  Default: 'An error occurred during authentication.',
  CredentialsSignin: 'Invalid email or password.',
  SessionRequired: 'Please sign in to access this page.',
}

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || 'Default'
  const errorMessage = errorMessages[error] || errorMessages.Default

  return (
    <div className="bg-destructive/8 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm text-center">
      {errorMessage}
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div>
          <h1 className="text-center text-2xl font-bold tracking-tight text-foreground">
            VentureVault
          </h1>
          <h2 className="mt-3 text-center text-lg font-medium text-muted-foreground">
            Authentication Error
          </h2>
        </div>

        <Suspense fallback={
          <div className="bg-muted border border-border px-4 py-3 rounded-md text-sm text-center text-muted-foreground">
            Loading...
          </div>
        }>
          <AuthErrorContent />
        </Suspense>

        <div className="space-y-3">
          <Link
            href="/auth/signin"
            className="block w-full text-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
          >
            Back to Sign In
          </Link>
          <Link
            href="/"
            className="block text-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
