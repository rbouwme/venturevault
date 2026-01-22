# Startup Funding Tracker

A production-ready web application for tracking newly funded startups in North America. Built with Next.js 14+, TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

## Features

- **Funding Feed**: Real-time updates on startup funding rounds from TechCrunch and VentureBeat
- **Advanced Filtering**: Filter by date, location, industry, round type, amount, and "Hiring Now" status
- **Company Profiles**: Detailed company pages with funding timeline, job postings, and key contacts
- **Watchlist**: Save companies you're interested in with personal notes
- **Saved Searches**: Save filter combinations for quick access
- **Email Alerts**: Get notified when new funding rounds match your criteria
- **AI Outreach**: Generate personalized cold emails, LinkedIn messages, and intro requests using OpenAI
- **Outreach Tracking**: Track the status of your outreach efforts
- **Admin Panel**: Control ingestion runs and view logs
- **Multi-user Support**: Role-based access control (USER/ADMIN)

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL 16 (via Docker)
- **ORM**: Prisma
- **Authentication**: NextAuth.js (credentials provider)
- **AI**: OpenAI API (GPT-4)
- **Email**: Resend
- **Data Sources**: RSS feeds (TechCrunch, VentureBeat)

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd startup-funding-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment file and configure it:
```bash
cp .env.example .env.local
```

4. Start the PostgreSQL database:
```bash
docker-compose up -d
```

5. Run database migrations:
```bash
npx prisma migrate dev
```

6. Generate Prisma client:
```bash
npx prisma generate
```

7. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/startup_tracker?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# OpenAI (optional - for AI outreach)
# Users provide their own API keys in settings

# Resend (for email notifications)
RESEND_API_KEY="your-resend-api-key"
EMAIL_FROM="notifications@yourdomain.com"

# Encryption (for storing user API keys)
ENCRYPTION_KEY="your-32-character-encryption-key"

# Cron authentication
CRON_SECRET="your-cron-secret"
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   └── admin/             # Admin pages
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── dashboard/        # Dashboard-specific components
│   ├── company/          # Company detail components
│   └── layout/           # Layout components
├── lib/                   # Utility libraries
│   ├── auth.ts           # NextAuth configuration
│   ├── prisma.ts         # Prisma client
│   └── utils.ts          # Helper functions
├── services/             # Business logic
├── ingestion/            # RSS feed ingestion
├── ai/                   # AI outreach generation
├── email/                # Email templates and sending
└── types/                # TypeScript types
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure environment variables
4. Deploy

The `vercel.json` file includes cron job configuration:
- Ingestion runs every 4 hours
- Alert emails are sent daily at 8 AM

### Database

For production, use a managed PostgreSQL service:
- Vercel Postgres
- Supabase
- Railway
- Neon

## API Routes

### Public
- `POST /api/auth/signup` - Create account
- `POST /api/auth/signin` - Sign in

### Protected (requires authentication)
- `GET /api/funding` - Get funding events
- `GET /api/companies/[id]` - Get company details
- `POST /api/watchlist` - Add to watchlist
- `DELETE /api/watchlist` - Remove from watchlist
- `POST /api/saved-searches` - Save a search
- `POST /api/outreach/generate` - Generate AI outreach
- `POST /api/outreach/save` - Save outreach draft

### Admin (requires ADMIN role)
- `POST /api/admin/ingest` - Trigger ingestion

### Cron (requires CRON_SECRET)
- `GET /api/cron/ingest` - Run scheduled ingestion
- `GET /api/cron/alerts` - Send alert emails

## License

MIT
