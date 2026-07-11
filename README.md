# Freelance CRM 

Hi there

**Live Demo:** [crm.mkfox.tech](https://crm.mkfox.tech)

A modern financial management CRM I built for freelancers to track projects, income, subscriptions, and get AI-powered insights.

---

## Features

This is my personal CRM system designed to help freelancers manage their finances efficiently. It features a beautiful dark UI with orange accents and includes multi-currency support, real-time exchange rates, and AI analytics powered by Google Gemini.

### What it can do:
- **Project Management** - Create and track freelance projects with tax calculation
- **Multi-Currency Support** - Work with RUB, USD, EUR, KZT, BYN with automatic conversion
- **Financial Analytics** - Visual charts showing income trends and comparisons
- **Subscription Tracking** - Never miss a recurring payment with the payment calendar
- **Budget Limits** - Set monthly/yearly spending limits with visual progress
- **AI Analytics** - Get intelligent financial insights using Google Gemini
- **Secure Auth** - Email/password authentication with JWT sessions
- **Status Toggle** - Quick switch between Active/Completed project status

---

## Tools & Tech Stack

**Core:** Next.js 16, TypeScript

**Database:** Prisma ORM, SQLite (local) + Turso/libSQL (production)

**Authentication:** NextAuth.js v5

**Styling:** Tailwind CSS 4

**UI Components:** Radix UI, shadcn/ui

**Charts:** Recharts

**Animations:** Framer Motion

**AI:** Google Gemini 2.5 Flash API

**Currency API:** exchangerate-api.com

---

## Structure

- **Dashboard** - Main overview with total earnings, active projects, and quick stats
- **Income Charts** - Visual representation of earnings (daily/weekly/monthly/yearly) with Gross/Net toggle
- **Projects List** - Table view of all projects with status toggling, tax info, and currency conversion
- **Subscription Calendar** - Upcoming payments with color-coded urgency (overdue, soon, paid)
- **Budget Tracker** - Set and track spending limits with visual progress bars
- **AI Analytics** - Interactive chat for financial insights with suggested questions

---

## What I Learned

Building this project helped me:

- **Deepened my knowledge of Next.js 16** - App Router, Server Components, Server Actions, Middleware
- **Mastered Prisma ORM** - Complex schemas, migrations, multi-database support (SQLite for local, Turso for production)
- **Successfully integrated AI** - Google Gemini API for real-time financial analysis with custom prompts
- **Leveled up my state management** - Handling multi-currency conversions with proper caching and exchange rate API
- **Improved authentication flows** - NextAuth.js with custom credentials provider and JWT sessions
- **Built responsive charts** - Recharts with custom theming, tooltips, and dark mode styling
- **Production deployment** - Configured Turso/libSQL for serverless database hosting on Vercel
- **Domain configuration** - Set up custom domain with HTTPS on Vercel
- **Database management** - Manual SQL migrations, troubleshooting production database issues

---

## Future Improvements

- **Client Management** - Track clients and their projects separately
- **Email Notifications** - Reminders for subscription payments and budget limits via Resend
- **Dark/Light Theme** - Toggle between themes based on user preference
- **PostgreSQL Support** - Alternative database option for production (Neon, Supabase)
- **Mobile App** - React Native version for on-the-go tracking
- **Export Data** - CSV/PDF export for reports and taxes
- **Recurring Projects** - Auto-create projects for retainer clients

---

## How to Run Locally

If you want to run this project on your machine:

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd freelance-crm
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env` file in the root directory:
```
DATABASE_URL="file:./dev.db"
AUTH_SECRET="your-secret-key-here"
GEMINI_API_KEY="your-gemini-api-key"
```

> **Get Gemini API key:** https://aistudio.google.com/apikey

### 4. Initialize the database
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Run the development server
```bash
npm run dev
```

### 6. Open in browser
Navigate to **http://localhost:3000/**

---

## Production Deployment (Vercel + Turso)

### 1. Create Turso Database
1. Sign up at https://turso.tech
2. Create a new database
3. Get your database URL and auth token

### 2. Configure Vercel
In Vercel Dashboard → Settings → Environment Variables:
```
DATABASE_URL=libsql://your-db.your-org.turso.io
TURSO_AUTH_TOKEN=your-turso-token
AUTH_SECRET=your-secret-key
GEMINI_API_KEY=your-gemini-key
```

### 3. Create Database Tables
In Turso Dashboard → SQL Console → Run All:
```sql
-- Copy SQL schema from prisma/schema.prisma
```

### 4. Deploy
```bash
git push
```

Vercel will automatically build and deploy!

---

## 📬 Contact

Feel free to reach out if you have questions or suggestions!
- **Telegram:** @M1g3L14Ka

---

**Built with ❤️ using Next.js, TypeScript, and a lot of coffee ☕**

*Check out my other projects on my profile!*

---

## License

MIT License — feel free to use this project for learning or commercial purposes.
