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

**Database:** Prisma ORM + SQLite (local and production)

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
- **Mastered Prisma ORM** - Complex schemas, committed migrations, and SQLite operations
- **Successfully integrated AI** - Google Gemini API for real-time financial analysis with custom prompts
- **Leveled up my state management** - Handling multi-currency conversions with proper caching and exchange rate API
- **Improved authentication flows** - NextAuth.js with custom credentials provider and JWT sessions
- **Built responsive charts** - Recharts with custom theming, tooltips, and dark mode styling
- **Production deployment** - Operated the application on a Linux VPS with PM2 and a local SQLite database
- **Domain configuration** - Set up the custom domain behind Nginx and HTTPS
- **Database management** - Manual SQL migrations, troubleshooting production database issues

---

## Future Improvements

- **Client Management** - Track clients and their projects separately
- **Email Notifications** - SMTP reminders for subscription payments and budget limits
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

### Optional read-only demo workspace

Set `DEMO_USER_ID` to a stable, dedicated identifier, then provision fabricated demo data explicitly:

```bash
npm run db:seed:demo
```

The seed is idempotent and never runs during install, build, or application startup. The configured demo account has no password, is signed in only through the server-side demo flow, cannot mutate user data, and cannot call Gemini.

---

## AI conversation limits

Authenticated non-demo users can keep persistent assistant conversations. Each successful request stores the user and assistant messages together only after Gemini responds successfully. Gemini requests are aborted after approximately 25 seconds.

The assistant allows up to 5 attempts per user in a rolling minute and up to 50 successfully stored user messages per UTC day. The daily limit is derived from persisted owned messages. The short burst limiter is intentionally in memory because production currently runs one PM2 process: it resets whenever that process restarts and is not suitable for multi-instance deployment. Replace it with a shared limiter before adding more application instances.

---

## Password reset security core

The public `/forgot-password` and `/reset-password` pages deliver reset links through generic SMTP using Nodemailer. Password-reset tokens are cryptographically random, stored only as SHA-256 hashes, expire after 30 minutes, and are atomically single-use. Public forgot-password responses are identical for existing, unknown, demo, ineligible, throttled, and delivery-failure cases.

Configure these server-only values:

```dotenv
APP_URL="https://crm.mkfox.tech"
SMTP_HOST="smtp.example.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="no-reply@example.com"
SMTP_PASS="replace-with-provider-smtp-password"
SMTP_FROM="MKFox CRM <no-reply@example.com>"
```

`APP_URL` is the trusted origin used to construct reset links; production requires an absolute HTTPS URL. Port 465 normally uses direct TLS with `SMTP_SECURE=true`. Port 587 normally uses STARTTLS with `SMTP_SECURE=false`. Use provider-specific SMTP credentials or an app password when required. After changing production environment values, restart the existing process with `pm2 restart crm --update-env`.

Forgot-password delivery is limited to approximately three attempts per normalized-email hash in 15 minutes, and a recent valid token has a five-minute issuance cooldown. The in-memory limiter resets after a PM2 restart and is suitable only for the current single-process deployment; a multi-instance deployment requires a shared limiter.

Auth.js currently uses JWT sessions. Resetting a password does not invalidate JWTs that were issued before the reset; revoking those sessions requires a separate authentication-architecture change.

---

## SQLite backups on a VPS

This workflow applies only when `DATABASE_URL` in the project's existing `.env` is a local `file:` SQLite URL. It uses SQLite's online backup API, so it is safe to run while the application is using the database. Backups default to `/root/crm-backups`; set `CRM_BACKUP_DIR` to an absolute directory to use another location.

### Run a backup manually

From the production project root:

```bash
cd /root/crm
npm run db:backup
```

The command creates a timestamped backup, runs `PRAGMA integrity_check` against it, prints the backup path and integrity result, and exits with an error if verification does not return `ok`. The latest 14 matching backups are retained; older ones are deleted after a successful verified backup.

### Schedule a daily backup

Edit root's crontab with `sudo crontab -e` and add this entry:

```cron
0 3 * * * cd /root/crm && /usr/bin/npm run db:backup >> /var/log/freelance-crm-backup.log 2>&1
```

### Test a restore safely

Never overwrite or open the live production database for a restore test. Copy a selected backup into a separate test file, then verify only that copy with Python 3's standard-library `sqlite3` module:

```bash
cp /root/crm-backups/freelance-crm-YYYYMMDDTHHMMSSffffffZ.sqlite3 /tmp/freelance-crm-restore-test.sqlite3
python3 - <<'PY'
import sqlite3
from pathlib import Path

test_database = Path("/tmp/freelance-crm-restore-test.sqlite3")
with sqlite3.connect(f"{test_database.as_uri()}?mode=ro", uri=True) as connection:
    results = connection.execute("PRAGMA integrity_check").fetchall()

integrity = "; ".join(str(row[0]) for row in results)
print(f"Integrity check: {integrity}")
if results != [("ok",)]:
    raise SystemExit(1)
PY
```

This verification requires no additional Python packages. If the restored data needs application-level testing afterward, use only a disposable test process configured for the separate `/tmp` file and a non-production port.

### Download an off-server copy

From your local computer, replace the host and backup filename as needed:

```bash
scp root@your-vps.example.com:/root/crm-backups/freelance-crm-YYYYMMDDTHHMMSSffffffZ.sqlite3 ./
```

Backups stored only on the same VPS are not sufficient: a disk failure, accidental deletion, server compromise, or provider loss can destroy both the live database and its local backups. Regularly copy verified backups to a separately secured system or object-storage account and test restoration from that off-server copy.

---

## Production Deployment (Linux VPS)

The active production environment is the Linux VPS checkout at `/root/crm`. It runs the `crm` PM2 process with a local SQLite database and is exposed through Nginx as the reverse proxy. Deployments come from `origin/main`.

Run the following sequence on the VPS:

1. Create and verify a database backup before changing the checkout:

   ```bash
   cd /root/crm
   npm run db:backup
   ```

2. Fetch the remote and fast-forward the deployment checkout to `origin/main`:

   ```bash
   git fetch origin
   git merge --ff-only origin/main
   ```

3. Install the exact locked dependencies, including the development tools required by verification:

   ```bash
   npm ci --include=dev
   ```

4. If the deployment includes new committed migrations under `prisma/migrations`, apply them before restarting the application:

   ```bash
   npm run db:migrate:deploy
   ```

   Do not use `prisma db push` in production. If there are no new committed migrations, skip this step.

5. Run the complete quality gate:

   ```bash
   npm run verify
   ```

6. Restart the existing PM2 process and confirm it is online:

   ```bash
   pm2 restart crm
   pm2 status crm
   ```

7. Perform an external health check through Nginx:

   ```bash
   curl --fail --silent --show-error https://crm.mkfox.tech/ > /dev/null && echo "Health check passed"
   ```

Vercel and Turso/libSQL are alternative hosting options supported by parts of the codebase, but they are not the active production environment and are not part of this deployment procedure.

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
