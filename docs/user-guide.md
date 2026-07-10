# ArcPM — User Guide

**Status:** Current  
**Last updated:** July 6, 2026  
**Owner:** Product / Engineering  
**Word export:** `03-Onboarding-Guide.docx` (regenerate with `npm run docs:generate`)

This guide is for **end users** — program creators, Program Ops, and teammates using ArcPM day to day. For onboarding architecture and engineering phases, see [`onboarding-workflow-plan.md`](./onboarding-workflow-plan.md).

---

## 1. What ArcPM is

ArcPM is an AI-powered program management workspace. You use it to:

- Log program changes and get AI risk analysis
- Track timeline, risks, launch readiness, and certifications
- Collaborate with a team scoped to **one program at a time**

ArcPM is **general-purpose**: you create your own programs (hardware, software, or mixed). Each program is an isolated workspace with its own team, roles, timeline, and data.

---

## 2. Getting started

### Sign up

1. Open ArcPM and click **Sign up** (or use an invite link when email invites ship in Phase 3).
2. Sign in with **Google**.
3. **Confirm your profile** — verify your display name on `/onboarding/account`.
4. Choose your path:
   - **Create a program** — name, optional version/launch date, template (`hardware` or `empty`). You become **Program Ops** on that program.
   - **Join via invite** — accept the invite preview on `/onboarding/join` (Phase 3). Your role is assigned by the inviter; you do not self-select.

After your first program is created, you may see a skippable **Invite your team** step. Email invites are not live yet — use **Users & roles** to share the signup link for now.

### Demo mode

Set `NEXT_PUBLIC_DEMO_MODE=true` locally to preview the UI without Supabase. Demo mode skips auth and onboarding gates. Data saves to **browser localStorage** only.

---

## 3. Programs & the program switcher

The dropdown at the top of the sidebar lists every program you belong to. All views — timeline, risks, launch, users, settings — are scoped to the **selected program**.

- **Switch programs** — pick another name in the dropdown; your role may differ per program.
- **+ New program** — create another workspace. You are Program Ops on programs you create.
- **Launch date** — shown in the sidebar footer when set on the program.

---

## 4. Roles (per program)

Roles live on **program membership**, not on your global account. The same person can be Program Ops on one program and NPI on another.

| Role | Label | Typical focus |
|------|-------|----------------|
| `program_ops` | Program Ops | Full access — team, settings, all tracks and domains |
| `npi` | NPI | Hardware / validation / regulatory tracks and risks |
| `hw_quality` | HW Quality | Hardware / validation risks |
| `marketing` | Marketing | GTM / packaging tracks; launch domains Marketing, Logistics, Commerce |
| `product` | Product | App / algorithm tracks; Product launch domain |

Your role controls:

- **Which sidebar pages you see**
- **Which timeline tracks you can edit** (by component name)
- **Whether you can edit risks or launch readiness**

Program Ops sees **Users & roles** and **Program settings**. Other roles do not.

---

## 5. For Program Ops — team & settings

### Users & roles (`/users`)

- View all members on the active program
- Change a member's role with the dropdown (saves immediately)
- Solo team empty state: **Copy signup link** to share `/signup` with teammates
- **Phase 3:** email invites and pending-invite list

Roles changed here apply **only to the active program**.

### Program settings (`/program/settings`)

Program Ops only.

- **Timeline range** — set program start, end, and launch target dates (drives the Gantt chart span)
- **Components** — define the workstream taxonomy for this program (e.g. Frontend, Backend, Hardware, GTM). Timeline tracks pick from this list instead of free-text areas.

---

## 6. Navigating the app

| View | What it does |
|------|----------------|
| **Overview** | Log a change, run AI risk analysis, see timeline and risk snapshots |
| **Timeline** | Gantt chart — add, edit, remove tracks; see [Gantt legend](#gantt-chart-legend) below |
| **Risk register** | Full risk table — level, component/area, mitigation, next checkpoint |
| **Launch readiness** | Go / Watch / No Go checklist across Product, Marketing, Logistics, Commerce |
| **Certification** | Regulatory and compliance cert cards with status and target dates |
| **Change log** | History of AI analyses with input text and results |
| **Users & roles** | Team and roles (Program Ops only) |
| **Program settings** | Timeline dates and Components (Program Ops only) |

The sidebar **Tracks** section lists up to ten tracks from the active program with status badges. Tracks you own are highlighted.

### Gantt chart legend

On **Timeline** (and the Overview snapshot), the Gantt chart uses these visual cues:

| Symbol | Meaning |
|--------|---------|
| **Indigo vertical line** | **Today** — current date on the chart |
| **Green vertical line** | **Launch target** — program launch date from Program settings |
| **Dashed outline** on a bar | **Date changed** — the track end date was edited after creation |
| **Red outline** on a bar | **Delayed** — end date is in the past and the track is not complete |
| **Grey bar** | **Complete** — track marked complete (muted fill) |

The same legend appears below the chart on the Timeline page. The tracks table also shows a **Delayed** badge when a track is overdue.

---

## 7. Log your first change

1. Go to **Overview**.
2. Choose an input mode: **Free text**, **Paste report**, or **By risk item**.
3. Describe what changed — be specific (dates, parts, dependencies).
4. Click **Analyze risk**.
5. Review the AI card: risk score, launch impact, affected tracks, contingency actions.
6. The run is saved to **Change log** with your name.

**Tips for better AI output**

- Include numbers, dates, and named dependencies
- Paste full emails or reports in **Paste report** mode
- Use **By risk item** for a targeted update on a known issue

AI requires `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` on the server.

---

## 8. Add and edit program data

Before analysis is useful, populate your program:

| Page | Action |
|------|--------|
| **Program settings** | Set timeline dates; add Components (Program Ops) |
| **Timeline** | **+ Add track** — name, component, dates, status |
| **Risks** | **+ Add risk** — track, area/component, level, mitigation |
| **Launch readiness** | **+ Add item** per domain; set Go / Watch / No Go |
| **Certification** | **+ Add certification** — type, priority, status, target date |

Use **Edit** and **Remove** on rows/cards to update or delete items.

**Data persistence (current)**

- **Demo mode:** localStorage in this browser, per program
- **Production:** program metadata and components in Supabase; timeline/risks/launch may still use localStorage until Phase 4 wiring is complete — check [`project-tasks.md`](./project-tasks.md) for current status

---

## 9. Role permissions reference

| Role | Tracks owned | Edit risks? | Edit launch? |
|------|--------------|-------------|--------------|
| Program Ops | All | Yes — all | Yes — all domains |
| NPI | Hardware, Validation, Regulatory | Yes — owned tracks | No |
| HW Quality | Hardware, Validation | Yes — owned tracks | No |
| Marketing | GTM, Packaging | No | Yes — Marketing, Logistics, Commerce |
| Product | App, Algorithm | No | Yes — Product domain |

Only edit launch items in domains your role allows unless you are Program Ops.

---

## 10. Help & support

| Issue | What to do |
|-------|------------|
| Wrong role or missing page | Ask **Program Ops** on your program |
| Cannot see a program | You may not be a member — request access from the program creator |
| AI analysis fails | Confirm API keys are set; try more context in your input |
| App errors | Check Supabase status at [status.supabase.com](https://status.supabase.com) |

---

## Related documents

| Document | Path |
|----------|------|
| This guide (Word) | `docs/03-Onboarding-Guide.docx` |
| Onboarding workflow (engineering) | `docs/onboarding-workflow-plan.md` |
| Project tasks & QA | `docs/project-tasks.md` |
| PRD | `docs/01-PRD.docx` |
| Tech spec | `docs/02-Tech-Spec.docx` |
