# ArcPM — Onboarding Workflow Plan

**Status:** In progress (Phases 1–2 largely complete)  
**Last updated:** July 5, 2026  
**Owner:** Product / Engineering

---

## 1. Purpose

This document defines the target onboarding experience for ArcPM. ArcPM is a **general-purpose** AI-powered program management tool — not a single-product workspace. Users create their own programs (projects) and teams. SR1 in the codebase is **example/demo seed data only**.

Onboarding must answer three questions, in order:

1. **Who are you?** (account identity)
2. **Which program are you working on?** (create one or join via invite)
3. **What's your role on that program?** (assigned by inviter, or Program Ops if you created it)

---

## 2. Product model shift

### Today (implicit shared workspace)

| Aspect | Current behavior |
|--------|------------------|
| Programs | Seeded in SQL (SR1 v1 / v1.5 / v2); all users see all programs |
| Roles | Global on `user_profiles.role` |
| Onboarding | Pick name + self-select role → enter shared workspace |
| Team growth | Open `/signup`; Program Ops fixes roles later |
| Program creation | No UI — SQL seed only |

### Target (user-owned workspaces)

| Aspect | Target behavior |
|--------|-----------------|
| Programs | User creates programs; data scoped per program |
| Roles | Per-program on `program_members.role` |
| Onboarding | Account setup → **create program** OR **accept invite** |
| Team growth | Program Ops invites by email with role + program |
| Program creation | First-class flow with optional **program template** |

---

## 3. Target data model

```
users (Supabase auth)
  └── user_profiles (id, email, full_name, account_setup_complete, last_active_program_id)
        ├── program_members (user_id, program_id, role, status, invited_by, joined_at)
        └── program_invites (program_id, email, role, token, expires_at, accepted_at)
              └── programs (id, name, version, created_by, launch_target, template, status, ...)
                    └── tracks, risk_items, launch_items, change_log (program_id FK)
```

### Schema changes from current `schema.sql`

| Change | Detail |
|--------|--------|
| `user_profiles` | Remove `role`. Add `account_setup_complete boolean default false`. Add `last_active_program_id uuid FK nullable`. |
| `programs` | Add `created_by uuid FK → user_profiles`. Add `template text default 'hardware'` (hardware \| empty). Make `version` nullable or default `''`. Deprecate `reporter` (use program lead via membership or drop). |
| `program_members` | **New.** Active membership + role per program. |
| `program_invites` | **New.** Pending invites before user exists or accepts. |
| `handle_new_user` trigger | Stop setting `role`. Set `full_name` from Google metadata; leave `account_setup_complete = false`. |
| RLS | Replace global authenticated read-all with membership-scoped policies. |
| SR1 seed | Remove from default install; keep as demo / sample loader only. |

### `program_members`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| program_id | uuid FK | |
| user_id | uuid FK | → user_profiles (nullable until invite accepted — prefer linking via invite flow) |
| role | text | program_ops \| npi \| hw_quality \| marketing \| product |
| status | text | active \| removed |
| invited_by | uuid FK | nullable |
| joined_at | timestamptz | |

> **Note:** Pending invites live in `program_invites`, not `program_members.status = invited`. On accept, insert `program_members` with `status = active`.

### `program_invites` (MVP — decided)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| program_id | uuid FK | |
| email | text | Normalized lowercase |
| role | text | One of five template roles |
| invited_by | uuid FK | |
| token | text unique | URL-safe; used in `/onboarding/join?token=` |
| expires_at | timestamptz | e.g. 7 days |
| accepted_at | timestamptz | nullable |
| revoked_at | timestamptz | nullable |

**Why not Supabase Auth invite alone:** multi-program invites need app-level `program_id` + `role` metadata and work before the user picks which program to join. Supabase invite can remain optional for email delivery; acceptance is app-controlled via token.

### RLS pattern (per program)

```sql
-- Helper: user has active membership on program
exists (
  select 1 from program_members
  where user_id = auth.uid()
    and program_id = tracks.program_id  -- example
    and status = 'active'
)

-- Program Ops on THIS program (not global)
exists (
  select 1 from program_members
  where user_id = auth.uid()
    and program_id = $program_id
    and role = 'program_ops'
    and status = 'active'
)
```

Apply membership checks to: `programs`, `tracks`, `risk_items`, `launch_items`, `change_log`, and team management on `program_members` / `program_invites`.

---

## 4. Onboarding state machine

Evaluate gates in **priority order** after auth:

| Priority | Condition | Route |
|----------|-----------|-------|
| 1 | `!account_setup_complete` | `/onboarding/account` |
| 2 | Valid pending invite token in URL or email match | `/onboarding/join` |
| 3 | Zero active memberships | `/onboarding/create-program` |
| 4 | Otherwise | App (`/` or `last_active_program_id`) |

**Fully onboarded** = `account_setup_complete` **and** ≥1 active `program_members` row.

### Gate definitions

```
needsAccountSetup      = user_profiles.account_setup_complete = false
needsInviteAcceptance  = valid program_invites row (email match, not expired/revoked/accepted)
needsProgramSetup      = zero active program_members AND NOT needsInviteAcceptance
isFullyOnboarded       = account_setup_complete AND active membership count ≥ 1
```

**Account step:** Always shown once for new users — confirm or edit Google-prefilled name, then set `account_setup_complete = true`. Do not rely on `full_name` presence alone (DB trigger always sets a placeholder from email).

### Auth callback routing

After Google OAuth (`/auth/callback`):

1. If `!account_setup_complete` → `/onboarding/account` (preserve `?token=` query if present)
2. Else if invite token in URL → `/onboarding/join?token=...`
3. Else if pending invite for user email → `/onboarding/join?token=...`
4. Else if zero active memberships → `/onboarding/create-program`
5. Else → `/` (restore `last_active_program_id` or first membership)

---

## 5. Onboarding paths

### Path A — Program creator

1. Sign up (Google OAuth — **MVP signup provider**)
2. **Account** — confirm full name → `account_setup_complete = true`
3. **Create program** — name, optional version, optional launch target, **template** (hardware \| empty)
4. Auto-assigned **`program_ops`** on that program
5. **Invite team** (skippable) → `/onboarding/invite`
6. Land on `/` with creator empty states

### Path B — Invitee

1. Open invite link → sign up / sign in (Google)
2. **Account** — confirm name (if not yet complete)
3. **Join preview** — program name, assigned role, inviter
4. Accept → insert `program_members`, set `accepted_at`, set `last_active_program_id`
5. Land on role-appropriate page (§10)

Invitees **do not** self-select role.

### Returning user

- ≥1 active membership → restore `last_active_program_id` → app home
- Incomplete account → resume `/onboarding/account`
- Pending invite only → `/onboarding/join`

### Demo mode (parallel path)

- No Supabase auth; skip onboarding gates
- Preload **sample program** (SR1-style data), clearly labeled
- "Continue in demo mode" from `/login` unchanged
- Does not create real `program_members` rows

---

## 6. Onboarding routes

| Step | Route | Audience | Purpose |
|------|-------|----------|---------|
| 1. Auth | `/signup`, `/login` | All | Google OAuth (MVP) |
| 2. Account | `/onboarding/account` | New users | Confirm name; set `account_setup_complete` |
| 3a. Create program | `/onboarding/create-program` | Creators | First workspace + template |
| 3b. Accept invite | `/onboarding/join` | Invitees | Confirm membership |
| 4. Invite team | `/onboarding/invite` | Creators | Skippable |
| 5. App | `/`, `/timeline`, … | All | Normal usage |

**UI:** Hide sidebar on `/login`, `/signup`, `/auth/*`, `/onboarding/*`.

---

## 7. Program templates & roles

ArcPM is general-purpose, but **MVP ships one program template: `hardware`**. Roles and default tracks are template-scoped, not universal product constants.

### Hardware template (default)

| Role | Label | Track ownership | Launch edit |
|------|-------|-----------------|-------------|
| program_ops | Program Ops | All | All domains |
| npi | NPI | Hardware, Validation, Regulatory | No |
| hw_quality | HW Quality | Hardware, Validation | No |
| marketing | Marketing | GTM, Packaging | Marketing, Logistics, Commerce |
| product | Product | App, Algorithm | Product domain |

### Empty template

- No tracks seeded; roles still available for invites (same five roles for MVP)
- User adds tracks manually on Timeline

### Future (out of MVP scope)

- Custom roles per program
- Additional templates (software-only, mixed)
- Template picker at program create

**Implementation:**

- `useAccess()` reads role from **active program membership**
- `ROLE_META` keyed by template + role (MVP: hardware only)
- `/users` = "Team — {active program name}"
- Program Ops on Program A ≠ access to Program B

---

## 8. Program creation (MVP)

### Fields

| Field | Required | Notes |
|-------|----------|-------|
| Program name | Yes | e.g. "Project Phoenix" |
| Display name | Yes | From account step |
| Version | No | Default `''` if omitted (schema must allow nullable) |
| Launch target | No | |
| Template | No | Default **`hardware`** (seeds tracks); **`empty`** optional |

### Auto-setup on create

1. Insert `programs` (`created_by`, `template`, …)
2. Insert `program_members` (creator, `program_ops`, `active`)
3. If `template = hardware`: seed default tracks (Hardware, Firmware, Algorithm, App, Validation, Regulatory, Packaging, GTM)
4. Set `user_profiles.last_active_program_id`

### SR1 / demo data

- Not created for new production users
- Demo mode + optional "Load sample program" uses SR1-style data, labeled as example

---

## 9. Invite flow

### Who can invite

Program Ops on the **active program** (`/onboarding/invite`, `/users`).

### API (planned)

| Method | Route | Action |
|--------|-------|--------|
| POST | `/api/programs` | Create program + membership |
| POST | `/api/programs/[id]/invites` | Create invite, send email |
| POST | `/api/invites/accept` | Accept by token |
| GET | `/api/invites/[token]` | Preview invite (program name, role, inviter) |
| DELETE | `/api/programs/[id]/invites/[id]` | Revoke pending invite |

### Invitee experience

1. Email: "You've been invited to {Program} on ArcPM as {Role}"
2. Link → `/onboarding/join?token=...` (signup/login if needed)
3. Accept → `program_members` + `accepted_at`
4. Redirect per §10

### Security

- Invite-only per program (no public join links) for MVP
- Token expiry + revoke support

---

## 10. Post-onboarding landing

| Role | Route |
|------|-------|
| program_ops | `/` (Overview) |
| npi | `/timeline` |
| hw_quality | `/risks` |
| marketing | `/launch` |
| product | `/` or `/timeline` |

Optional: dismissible first-run hint card (stored in `user_metadata` or localStorage).

---

## 11. Empty states (new programs)

| Page | Empty state |
|------|-------------|
| Overview | "Log your first change to get AI risk analysis" |
| Users | "Invite your first teammate" |
| Timeline | "Add tracks to plan your program" (empty template only) |
| Risks | "Add your first risk item" |
| Launch | "Add launch readiness items" |
| Cert | "Add certifications you're tracking" |

Invitees joining populated programs skip creator empty states.

---

## 12. Edge cases & recovery

| Scenario | Behavior |
|----------|----------|
| Removed from only program | Redirect to `/onboarding/create-program`; retain account |
| Invite email already has account | Login → join flow; link invite to existing user |
| Already active member clicks invite | Show "Already a member" → go to program |
| Expired / revoked invite | Error page; contact Program Ops |
| Creator skips invite step | Invite later from `/users` |
| User in multiple programs | Sidebar switcher; persist `last_active_program_id` |
| User creates second program | Settings or sidebar "New program" → create flow; switch active |
| Email/password login (legacy) | Same gate logic after login; no email signup in MVP |

---

## 13. Auth strategy (MVP)

| Path | MVP |
|------|-----|
| Sign up | Google OAuth only |
| Sign in | Google OAuth (+ existing email/password users supported) |
| Email signup | Out of scope for MVP |
| Demo | Local preview, no onboarding gates |

Replace `user_metadata.onboarded` with derived state (`account_setup_complete` + membership).

---

## 14. Implementation status vs target

### Current code (not yet migrated)

```
/signup → Google OAuth → /auth/callback
  → if !onboarded: /onboarding (name + role self-select)
  → completeOnboarding() → /
```

- Signup copy still references SR1 workspace
- Global `user_profiles.role`; `getPrograms()` returns all
- Sidebar visible during onboarding
- `03-Onboarding-Guide.docx` is SR1/Sara-specific — **rewrite when implementing**

### Target changes

| Area | Target |
|------|--------|
| Signup copy | "Create a program or join your team" |
| Onboarding pages | account → create \| join (no global role picker) |
| Data model | `program_members`, `program_invites`, schema delta above |
| Access control | Per-program role via `useAccess()` |
| Team growth | Invite by email from `/users` |
| Demo | Sample program template, not default for real users |

---

## 15. Build phases

> **Overall task tracker (done / in test / backlog):** see [`docs/project-tasks.md`](./project-tasks.md).

### Phase 1 — Schema + gates

- [x] `program_members`, `program_invites`, `user_profiles` delta, `programs.created_by`
- [x] Update `handle_new_user` trigger
- [x] RLS membership policies
- [x] Onboarding state machine in `AppShell`
- [x] `/onboarding/account`, route split; hide sidebar on onboarding routes

### Phase 2 — Create program + scoped access

- [x] `POST /api/programs` + create-program UI
- [x] Hardware template track seed
- [x] `AuthContext`: memberships, `last_active_program_id`, filtered programs
- [x] Program-scoped `useAccess()`
- [x] Empty states
- [x] Program switcher + “+ New program” for existing users
- [x] Server-side program create via secret key (RLS workaround for new Supabase projects)

### Phase 3 — Invites

- [ ] Invite API + email
- [ ] `/onboarding/join` accept flow
- [ ] `/users` invite form + pending invites list

### Phase 4 — Data persistence + polish

- [ ] Wire Timeline, Risks, Launch, Cert to Supabase (replace localStorage)
- [ ] Changelog page → API
- [ ] Demo / SR1 sample loader
- [ ] Role-specific landing hints
- [ ] Rewrite `03-Onboarding-Guide.docx`
- [ ] Fix client RLS / publishable-key writes (reduce secret-key dependency)

See [`docs/project-tasks.md`](./project-tasks.md) for full checklist including Timeline QA.

---

## 16. Decided for MVP

| Decision | Choice |
|----------|--------|
| Multi-program per user | Yes |
| Programs per user limit | Unlimited (MVP) |
| Default program template | **Hardware** (seed tracks) |
| Join model | Invite-only |
| Role taxonomy | Fixed five roles, hardware template |
| Organization layer | No |
| Signup auth | Google OAuth |
| First Program Ops | Creator on their program |
| Invite storage | `program_invites` table + token URL |
| Active program persistence | `user_profiles.last_active_program_id` |
| Account completion flag | `user_profiles.account_setup_complete` |

---

## 17. Open questions (remaining)

| # | Question | Notes |
|---|----------|-------|
| 1 | Email delivery for invites | Supabase edge function vs Resend vs manual link copy for MVP |
| 2 | Deprecate `programs.reporter` | Drop vs map to "program lead" display name |
| 3 | Email/password sign-in | Remove from login UI or keep for legacy |
| 4 | Custom templates / roles | Post-MVP |

---

## 18. Related documents

| Document | Location | Status |
|----------|----------|--------|
| This workflow plan | `docs/onboarding-workflow-plan.md` | Current |
| Project task tracker | `docs/project-tasks.md` | Current |
| Generated Word version | `docs/05-Onboarding-Workflow-Plan.docx` | Regenerate after edits |
| Team onboarding guide | `docs/03-Onboarding-Guide.docx` | **Stale** — SR1-specific; rewrite in Phase 4 |
| Database schema | `supabase/schema.sql` | **Migrated** (run on Supabase) |
| PRD | `docs/01-PRD.docx` | Needs alignment with multi-tenant model |
| Tech spec | `docs/02-Tech-Spec.docx` | Needs alignment |
| Project tracker | `docs/04-Project-Tracker.docx` | |

Regenerate Word docs: `npm run docs:generate`
