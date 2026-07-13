# ArcPM — AI-Powered Program Management Tool

An AI co-pilot for program managers overseeing hardware product development. Log changes, get instant risk analysis, track launch readiness, and manage your program timeline — all in one place.

---

## Tech Stack

| Layer | Tech | Why |
|---|---|---|
| Frontend + API | Next.js 14 (App Router) | React UI + serverless API routes in one repo |
| Database | Supabase (Postgres) | Free tier, auth-ready, real-time capable |
| AI Engine | Anthropic Claude (claude-sonnet-4-6) | Risk analysis, contingency recommendations |
| Styling | Tailwind CSS | Fast, consistent, no CSS files to manage |
| Deployment | Vercel | One-click deploy, free tier, auto CI/CD |

---

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo>
cd arcpm
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → New project
2. Copy your **Project URL** and **anon public key**
3. Run the SQL schema below in the Supabase SQL editor

### 3. Set environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

> ⚠️ Never commit `.env.local` — it's in `.gitignore`

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Deploy to Vercel

```bash
npx vercel
```

Add the same env vars in Vercel dashboard → Settings → Environment Variables.

---

## Supabase Schema

Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor. It creates `user_profiles`,
`programs`, `program_members`, `program_invites`, `tracks`, `risk_items`, `launch_items`, and `change_log`,
each with Row Level Security scoped to program membership (not an open "allow all" policy).

If you're upgrading an existing project from the legacy single-user schema, run
`supabase/migrations/001_phase1_program_memberships.sql` first.

---

## Project Structure

```
arcpm/
├── app/
│   ├── layout.tsx              # Root layout, nav, sidebar
│   ├── page.tsx                # Overview — change input + AI panel + Gantt snapshot
│   ├── timeline/page.tsx       # Editable Gantt + track add/edit forms
│   ├── risks/page.tsx          # Full risk register with add/edit forms
│   ├── launch/page.tsx         # Launch readiness tracker
│   ├── cert/page.tsx           # Certification status cards
│   ├── changelog/page.tsx      # Change log feed with PM attribution
│   ├── login/page.tsx          # Sign-in (bypassed in demo mode)
│   └── api/
│       ├── analyze/route.ts    # POST — AI risk analysis
│       ├── analyze-launch/route.ts  # POST — launch readiness AI
│       ├── risks/route.ts      # GET/POST/PATCH — risk items CRUD
│       ├── launch-items/route.ts    # GET/POST/PATCH — launch items CRUD
│       ├── tracks/route.ts     # GET/PATCH — track dates CRUD
│       └── changelog/route.ts  # GET — change log with user join
├── components/
│   ├── Sidebar.tsx             # Nav + track list + CPs
│   ├── AppShell.tsx            # Auth gating + layout wrapper
│   ├── DemoBanner.tsx          # Demo mode banner
│   ├── ItemFormCard.tsx        # Shared add/edit form card
│   ├── GanttChart.tsx          # Reusable timeline component
│   ├── AiAnalysisCard.tsx      # AI result display
│   └── ChangeInput.tsx         # Free text / paste / item tabs
├── lib/
│   ├── supabase.ts             # Supabase client
│   ├── anthropic.ts            # Anthropic client + prompts
│   ├── AuthContext.tsx         # Auth + program context
│   ├── useAccess.ts            # Role-based access control
│   ├── useLocalProgramData.ts  # localStorage persistence (demo mode)
│   └── types.ts                # TypeScript types
├── docs/
│   ├── generate-docs.js              # Regenerates .docx project docs
│   ├── user-guide.md                 # End-user guide (source for 03-Onboarding-Guide.docx)
│   ├── onboarding-workflow-plan.md   # Onboarding design (programs + teams)
│   ├── project-tasks.md              # Delivery tracker
│   ├── 01-PRD.docx
│   ├── 02-Tech-Spec.docx
│   ├── 03-Onboarding-Guide.docx      # User guide (Word export)
│   ├── 04-Project-Tracker.docx
│   └── 05-Onboarding-Workflow-Plan.docx
├── supabase/schema.sql         # Full DB schema
├── .env.local                  # 🔒 Never commit this
├── .gitignore
├── package.json
└── tailwind.config.ts
```

---

## Features (MVP)

- **AI risk analysis** — free text, paste report, or per-item update → risk score, launch impact, contingency actions
- **Program timeline** — Gantt chart Feb–Oct 2026, editable dates, add/edit/remove tracks with status
- **Risk register** — live table with add/edit/remove, blocker/critical/major/minor badges
- **Launch readiness** — 4 domains (Product, Marketing, Logistics, Commerce), per-item Go/Watch/No Go, AI verdict
- **Certification tracker** — add/edit cert cards with priority, status, target dates
- **Change log** — every AI analysis stored with full JSON result, filterable feed
- **Demo mode** — preview the full UI locally without Supabase/Anthropic keys (`NEXT_PUBLIC_DEMO_MODE=true`)
- **Role-based access** — 5 roles with program switcher (SR1 v1 / v1.5 / v2)

Regenerate project docs after changes: `npm run docs:generate`

---

## Roadmap (after MVP)

- [ ] Auth (Supabase Auth) — add teammates with roles
- [ ] Multi-program support — manage multiple products
- [ ] Slack / email alerts — notify on critical risk changes
- [ ] PDF report export — weekly build status PDF
- [ ] Real-time sync — multiple PMs editing simultaneously

---

## Environment Variables Reference

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → Secret key (`sb_secret_...`). Server-only — never expose to the browser |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — preferred over Anthropic if set |
| `GEMINI_MODEL` | Optional — overrides the default model fallback chain (tries flash-lite, then 1.5-flash, then 2.0-flash) |
| `NEXT_PUBLIC_APP_URL` | App URL for OAuth redirects (e.g. `https://your-app.vercel.app` in production) |
| `NEXT_PUBLIC_DEMO_MODE` | Optional — set to `true` for local preview without Supabase/Anthropic keys |
