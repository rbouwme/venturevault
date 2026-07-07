import Link from 'next/link'
import { BarChart2, Target, Send, Star, Bell } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-20 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            <span className="block text-primary">VentureVault</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
            Find recently funded startups in Canada and the US. Discover hiring signals,
            find key contacts, and reach out before the job posts go public.
          </p>
          <div className="mt-10 flex justify-center gap-3">
            <Link
              href="/auth/signin"
              className="px-5 py-2.5 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="px-5 py-2.5 border border-border text-sm font-medium rounded-md text-foreground bg-background hover:bg-accent transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>

        {/* Feature grid — top row */}
        <div className="mt-20 grid md:grid-cols-3 gap-4">
          <div className="bg-card p-5 rounded-lg border border-border">
            <BarChart2 className="h-5 w-5 text-primary mb-3" />
            <h3 className="text-sm font-semibold text-foreground">Funding Feed</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Real-time updates on startup funding rounds from TechCrunch and VentureBeat.
            </p>
          </div>
          <div className="bg-card p-5 rounded-lg border border-border">
            <Target className="h-5 w-5 text-primary mb-3" />
            <h3 className="text-sm font-semibold text-foreground">Hiring Signals</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Identify companies actively hiring. Filter by role type, location, and department.
            </p>
          </div>
          <div className="bg-card p-5 rounded-lg border border-border">
            <Send className="h-5 w-5 text-primary mb-3" />
            <h3 className="text-sm font-semibold text-foreground">AI Outreach</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Generate personalized cold emails, LinkedIn messages, and intro requests powered by AI.
            </p>
          </div>
        </div>

        {/* Feature grid — bottom row */}
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="bg-card p-5 rounded-lg border border-border">
            <Star className="h-5 w-5 text-primary mb-3" />
            <h3 className="text-sm font-semibold text-foreground">Watchlist</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Save companies you are interested in and add notes for future reference.
            </p>
          </div>
          <div className="bg-card p-5 rounded-lg border border-border">
            <Bell className="h-5 w-5 text-primary mb-3" />
            <h3 className="text-sm font-semibold text-foreground">Email Alerts</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Get notified when new funding rounds match your saved search criteria.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
