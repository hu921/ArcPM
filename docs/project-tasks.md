# ArcPM — Project Tasks

**Status:** Active development  
**Last updated:** July 7, 2026  
**Owner:** Product / Engineering

This document tracks overall ArcPM delivery: what's done, what's in test, and what's next. For onboarding design details, see [`onboarding-workflow-plan.md`](./onboarding-workflow-plan.md).

---

## Current state

ArcPM is a multi-program workspace: users sign up with Google, complete onboarding, create programs, and manage tracks/risks/launch data per program. Roles live on `program_members`, not global profiles.

**Local dev stack:** Next.js 14, Supabase (publishable + secret keys), optional Anthropic for AI.

**Known constraint:** New Supabase projects may block browser-side RLS writes. Program creation uses a server API route with `SUPABASE_SERVICE_ROLE_KEY` until client RLS is fully resolved.

---

## Done

- Supabase schema + RLS (`user_profiles`, `programs`, `program_members`, `program_invites`, `tracks`, `risk_items`, `launch_items`, `change_log`)
- Migration path: `supabase/migrations/001_phase1_program_memberships.sql`
- Tracks write policies: `supabase/migrations/002_tracks_write_policies.sql`
- Google sign-up + auth callback
- Onboarding flow: account → create program → invite stub
- Onboarding state machine in `AppShell` (gates + sidebar hide)
- Program creation via `POST /api/programs` (server auth + secret key)
- Program switcher + “+ New program” for existing users
- `AuthContext`: memberships, `activeRole`, `last_active_program_id`
- Program-scoped `useAccess()`
- Users page wired to `program_members` (role edit per program)
- Program settings hub stub at `/program/settings` (Program Ops only; full edit coming with migration)
- Empty states on Overview, Timeline, Risks, Launch, Cert, Users
- Demo mode (`NEXT_PUBLIC_DEMO_MODE=true`) for UI-only preview
- Changelog API: role from `program_members` (not global profile role)
- **User guide** rewritten — `docs/user-guide.md` + `03-Onboarding-Guide.docx` (multi-program, per-program roles, Program settings; removed SR1 / workspace-admin copy)

---

## In progress / ready to test

Manual QA on a real Supabase project (`NEXT_PUBLIC_DEMO_MODE=false`):

- **Timeline** — add/edit/remove tracks, Gantt chart, inline date slip, “Analyze changes” → Overview
- **Risks** — add/edit risk register items (localStorage per program)
- **Launch** — checklist items + AI readiness analysis
- **Cert** — certification cards
- **Overview** — log change + AI risk analysis (requires `ANTHROPIC_API_KEY`)
- **Users & roles** — view team, change roles on active program
- **Multi-program** — create second program, switch in sidebar, confirm isolated data

### Timeline test checklist

- [ ] Open `/timeline` with active program selected
- [ ] Empty state shows when no tracks (Empty template programs)
- [ ] **+ Add track** — name, component/area, dates, status (area = free text until Components ship)
- [ ] Gantt bar renders in chart
- [ ] Track appears in table with DRI = signed-in user
- [ ] Edit end date inline → **Date slip** badge
- [ ] **✦ Analyze changes** → redirects to Overview with prefilled input
- [ ] Add second track (different area)
- [ ] Refresh page → tracks persist (localStorage, this browser)
- [ ] Switch program → timeline data is separate per program
- [ ] Edit and Remove track actions work

> **Note:** Timeline currently uses **browser localStorage** (`useLocalProgramData`), not Supabase `tracks`. Data persists per program in this browser only.

### Product direction: Area → Component (planned)

**Today:** Timeline **Area** is free text with hardware-themed autocomplete (Hardware, Firmware, GTM, …). Not right for web apps like ArcPM.

**Target:** Rename **Area** to **Component** — a **per-program taxonomy** defined by admins, not hardcoded.

| Concept | Meaning |
|---------|---------|
| **Component** | Workstream bucket for a program (e.g. Frontend, Backend, Auth, Infrastructure for ArcPM) |
| **Timeline track** | A dated item on the Gantt; each track belongs to one Component |
| **Who defines Components** | **Program Ops** on that program (program creator / admin). Same permission as `/users` role management. |

**Example — ArcPM (web app):**

- Components (Program Ops creates): `Frontend`, `Backend`, `Auth`, `Database`, `DevOps`
- Timeline tracks (any member with track access): `Supabase schema + RLS` → Component **Backend**

**Build plan (Phase 4+):**

- [ ] New table `program_components` (`program_id`, `name`, `color`, `sort_order`, `created_by`)
- [ ] Settings or `/users` UI: Program Ops adds/edits/removes Components
- [ ] Timeline + Risks: Component dropdown from program list (no free-text hardware list)
- [ ] Hardware template: seed default Components on program create (optional), not global constants
- [ ] RLS: only `program_ops` can INSERT/UPDATE/DELETE components; all members can read

**Until then:** type any label in Area (e.g. `Backend`) — treat it as a temporary Component name.

---

## Phase 3 — Invites

- [ ] Invite API (create invite, revoke, list pending)
- [ ] Email delivery or copy-link fallback for MVP
- [ ] `/onboarding/join?token=` accept flow (wire to API)
- [ ] `/users` invite form + pending invites list
- [ ] Signup with `?token=` preserves invite through Google OAuth

---

## Phase 4 — Wire pages to Supabase

Replace localStorage with database persistence:

- [ ] New table `program_components` + Program Ops CRUD UI
- [ ] Timeline + Risks use Component dropdown (replaces free-text Area)
- [ ] **Risks** → `risk_items`
- [ ] **Launch** → `launch_items`
- [ ] **Cert** → new table or reuse pattern (TBD)
- [ ] **Changelog page** → `GET /api/changelog`
- [ ] **Overview** risk snapshot → live data from `risk_items`
- [ ] Load hardware-template tracks from DB on program create (show on Timeline)
- [ ] Sidebar track list from live DB (remove hardcoded SR1 sample tracks)

---

## Phase 6 — Program sub-projects (planned, defer)

**Status:** Idea captured — do **not** build until Phase 4 persistence and Launch/Cert/Changelog flows are stable.

A **program** (e.g. ArcPM, Signal Ring SR1) may contain several **smaller or medium projects** that teams run in parallel:

| Sub-project | Example scope |
|-------------|----------------|
| Firmware | Embedded stack, OTA, device bring-up |
| Application | Mobile/web app features |
| Issue fixing | Side effort — bug bash, hotfix track |

This is **not** the same as **Components** (`program_components`), which today are lightweight workstream labels on Timeline tracks and Risks (Frontend, Backend, Hardware). Components group work; **sub-projects** would be **containers** with their own scope and optionally their own lifecycle.

### Target hierarchy (concept)

```
Program
  ├── Sub-project: Firmware
  ├── Sub-project: Application
  └── Sub-project: Issue fixing
        └── Timeline tracks, risks, launch items (scoped to sub-project)
```

### Open product questions (decide before build)

- [ ] Does each sub-project have its own **status** (active / paused / complete)?
- [ ] Own **DRI / owner** and **target dates**?
- [ ] **Timeline + Risks + Launch** all filterable by sub-project, or timeline only?
- [ ] Can one track belong to **multiple** sub-projects, or strictly one?
- [ ] Relationship to **Components**: replace, nest under sub-project, or keep both?

### Implementation options (when ready)

| Option | Approach | Tradeoff |
|--------|----------|----------|
| **A — Extend components** | Rename UI to “Projects”; add `status`, `owner`, `description` on `program_components` | Faster; components were not designed as full containers |
| **B — New table** | `program_projects` (`program_id`, `name`, `status`, `owner`, …); add optional `project_id` FK on `tracks`, `risk_items`, `launch_items` | Cleaner model; touches Timeline, Risks, Launch, Overview, settings, sidebar |

### Suggested timing

1. Finish Phase 4 (Cert, Changelog, remaining Supabase wiring)
2. Stabilize Launch drill-down UX
3. Revisit this section with real program data (2+ parallel efforts under one program)
4. Prototype Option B in a migration + Program Settings UI before rolling filters to all pages

---

## Phase 5 — Polish & production

- [ ] Reduce reliance on secret key — fix client RLS / publishable-key auth for `.from()` calls
- [ ] Role-specific landing hints (NPI → Timeline, HW Quality → Risks, etc.)
- [x] Rewrite user guide — `docs/user-guide.md` + `03-Onboarding-Guide.docx` (July 2026)
- [ ] Demo / SR1 sample loader (optional seed, not default for real users)
- [ ] Deploy to Vercel with production env vars
- [ ] Planned Next.js security upgrade (do **not** use `npm audit fix --force`)
- [ ] Regenerate Word docs: `npm run docs:generate`

---

## Environment variables

| Variable | Required for | Notes |
|----------|--------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Full stack | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Full stack | Publishable key (`sb_publishable_...`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Program create (server) | Secret key (`sb_secret_...`) — never expose to browser |
| `ANTHROPIC_API_KEY` | AI analysis (Claude) | Overview, Launch readiness — fallback if no Gemini key |
| `GEMINI_API_KEY` | AI analysis (Gemini) | Overview, Launch readiness — **preferred** when set |
| `GEMINI_MODEL` | Optional | Default `gemini-2.0-flash` |
| `NEXT_PUBLIC_APP_URL` | OAuth | `http://localhost:3000` locally |
| `NEXT_PUBLIC_DEMO_MODE` | Local preview | `true` = UI only; `false` = real auth |

---

## Related documents

| Document | Path |
|----------|------|
| **User guide** | `docs/user-guide.md` · Word: `docs/03-Onboarding-Guide.docx` |
| Onboarding workflow plan | `docs/onboarding-workflow-plan.md` |
| Database schema | `supabase/schema.sql` |
| This task tracker | `docs/project-tasks.md` |
| PRD | `docs/01-PRD.docx` |
| Tech spec | `docs/02-Tech-Spec.docx` |
| Project tracker (Word) | `docs/04-Project-Tracker.docx` |

---

## Suggested work order

1. Complete Timeline QA (checklist above)
2. Risks → Launch → Overview AI smoke test
3. Phase 3 invites (team growth)
4. Phase 4 Supabase persistence (Cert, Changelog remaining)
5. Phase 5 polish + deploy
6. Phase 6 sub-projects (after core flows stable — see section above)
