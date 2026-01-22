import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">Startup Funding</span>
            <span className="block text-blue-600">Tracker</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600">
            Track newly funded startups in North America. Discover hiring signals,
            find key contacts, and generate personalized outreach.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link
              href="/auth/signin"
              className="px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-gray-900">Funding Feed</h3>
            <p className="mt-2 text-gray-600">
              Real-time updates on startup funding rounds from top sources like
              TechCrunch and VentureBeat.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-3xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold text-gray-900">Hiring Signals</h3>
            <p className="mt-2 text-gray-600">
              Identify companies that are actively hiring. Filter by role type,
              location, and department.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-3xl mb-4">✉️</div>
            <h3 className="text-lg font-semibold text-gray-900">AI Outreach</h3>
            <p className="mt-2 text-gray-600">
              Generate personalized cold emails, LinkedIn messages, and intro
              requests powered by AI.
            </p>
          </div>
        </div>

        <div className="mt-20 grid md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-3xl mb-4">⭐</div>
            <h3 className="text-lg font-semibold text-gray-900">Watchlist</h3>
            <p className="mt-2 text-gray-600">
              Save companies you are interested in and add notes for future reference.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-3xl mb-4">🔔</div>
            <h3 className="text-lg font-semibold text-gray-900">Email Alerts</h3>
            <p className="mt-2 text-gray-600">
              Get notified when new funding rounds match your saved search criteria.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
