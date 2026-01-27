import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            <span className="block">Startup Funding</span>
            <span className="block text-blue-600">Tracker</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-muted-foreground">
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
              className="px-6 py-3 border border-border text-base font-medium rounded-md text-foreground bg-background hover:bg-accent transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-foreground">Funding Feed</h3>
            <p className="mt-2 text-muted-foreground">
              Real-time updates on startup funding rounds from top sources like
              TechCrunch and VentureBeat.
            </p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
            <div className="text-3xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold text-foreground">Hiring Signals</h3>
            <p className="mt-2 text-muted-foreground">
              Identify companies that are actively hiring. Filter by role type,
              location, and department.
            </p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
            <div className="text-3xl mb-4">✉️</div>
            <h3 className="text-lg font-semibold text-foreground">AI Outreach</h3>
            <p className="mt-2 text-muted-foreground">
              Generate personalized cold emails, LinkedIn messages, and intro
              requests powered by AI.
            </p>
          </div>
        </div>

        <div className="mt-20 grid md:grid-cols-2 gap-8">
          <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
            <div className="text-3xl mb-4">⭐</div>
            <h3 className="text-lg font-semibold text-foreground">Watchlist</h3>
            <p className="mt-2 text-muted-foreground">
              Save companies you are interested in and add notes for future reference.
            </p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
            <div className="text-3xl mb-4">🔔</div>
            <h3 className="text-lg font-semibold text-foreground">Email Alerts</h3>
            <p className="mt-2 text-muted-foreground">
              Get notified when new funding rounds match your saved search criteria.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
