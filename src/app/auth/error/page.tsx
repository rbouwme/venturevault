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
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm text-center">
      {errorMessage}
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">
            Startup Funding Tracker
          </h1>
          <h2 className="mt-6 text-center text-2xl font-semibold text-gray-900">
            Authentication Error
          </h2>
        </div>

        <Suspense fallback={
          <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded-md text-sm text-center">
            Loading...
          </div>
        }>
          <AuthErrorContent />
        </Suspense>

        <div className="text-center space-y-4">
          <Link
            href="/auth/signin"
            className="inline-block w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Sign In
          </Link>
          <Link
            href="/"
            className="block text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
