const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageBreak, TabStopType, TabStopPosition
} = require('docx');
const fs = require('fs');
const path = require('path');

const OUT = __dirname;

// ─── Design tokens ──────────────────────────────────────────────────────────
const INDIGO  = '4F46E5';
const INDIGO_LIGHT = 'EEF2FF';
const SLATE   = '475569';
const SLATE_LIGHT = 'F8FAFC';
const RED     = 'DC2626';
const AMBER   = 'D97706';
const GREEN   = '16A34A';
const BORDER  = 'E2E8F0';
const WHITE   = 'FFFFFF';
const BLACK   = '0F172A';

const PAGE = { width: 12240, height: 15840 };
const MARGINS = { top: 1080, right: 1080, bottom: 1080, left: 1080 };
const CONTENT_W = PAGE.width - MARGINS.left - MARGINS.right; // 10080

const border = (color = BORDER) => ({ style: BorderStyle.SINGLE, size: 1, color });
const borders = (color = BORDER) => ({ top: border(color), bottom: border(color), left: border(color), right: border(color) });
const noBorder = () => ({ style: BorderStyle.NONE, size: 0, color: 'FFFFFF' });
const noBorders = () => ({ top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder() });
const cellMargins = { top: 100, bottom: 100, left: 140, right: 140 };

// ─── Common styles ───────────────────────────────────────────────────────────
const STYLES = {
  default: {
    document: { run: { font: 'Arial', size: 22, color: BLACK } }
  },
  paragraphStyles: [
    { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { size: 36, bold: true, font: 'Arial', color: BLACK },
      paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 } },
    { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { size: 28, bold: true, font: 'Arial', color: INDIGO },
      paragraph: { spacing: { before: 300, after: 100 }, outlineLevel: 1 } },
    { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { size: 24, bold: true, font: 'Arial', color: SLATE },
      paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
  ]
};

const NUMBERING = {
  config: [
    { reference: 'bullets', levels: [
      { level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } }, run: { font: 'Arial', size: 22 } } },
      { level: 1, format: LevelFormat.BULLET, text: '\u25E6', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 1080, hanging: 360 } }, run: { font: 'Arial', size: 22 } } },
    ]},
    { reference: 'numbers', levels: [
      { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } }, run: { font: 'Arial', size: 22 } } },
    ]},
  ]
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const P = (text, opts = {}) => new Paragraph({
  children: [new TextRun({ text, font: 'Arial', size: opts.size || 22, bold: opts.bold, color: opts.color || BLACK, italics: opts.italic })],
  spacing: { before: opts.before || 60, after: opts.after || 60 },
  alignment: opts.align || AlignmentType.LEFT,
});

const H1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text, font: 'Arial', size: 36, bold: true, color: BLACK })] });
const H2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, font: 'Arial', size: 28, bold: true, color: INDIGO })] });
const H3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text, font: 'Arial', size: 24, bold: true, color: SLATE })] });

const bullet = (text, level = 0, ref = 'bullets') => new Paragraph({
  numbering: { reference: ref, level },
  children: [new TextRun({ text, font: 'Arial', size: 22, color: BLACK })],
  spacing: { before: 40, after: 40 },
});

const numbered = (text) => bullet(text, 0, 'numbers');

const spacer = (lines = 1) => new Paragraph({ children: [new TextRun('')], spacing: { before: 60 * lines, after: 0 } });

const divider = () => new Paragraph({
  children: [new TextRun('')],
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER } },
  spacing: { before: 160, after: 160 },
});

const titleBlock = (title, subtitle, meta) => [
  new Paragraph({
    children: [new TextRun({ text: title, font: 'Arial', size: 56, bold: true, color: BLACK })],
    spacing: { before: 0, after: 120 },
  }),
  new Paragraph({
    children: [new TextRun({ text: subtitle, font: 'Arial', size: 26, color: SLATE, italics: true })],
    spacing: { before: 0, after: 80 },
  }),
  new Paragraph({
    children: [new TextRun({ text: meta, font: 'Arial', size: 20, color: SLATE })],
    spacing: { before: 0, after: 240 },
  }),
  divider(),
];

const cell = (children, opts = {}) => new TableCell({
  children: Array.isArray(children) ? children : [P(children, opts.textOpts || {})],
  borders: opts.borders || borders(),
  shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined,
  margins: cellMargins,
  width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
  verticalAlign: opts.vAlign,
  columnSpan: opts.span,
});

const headerCell = (text, width, shade = INDIGO) => new TableCell({
  children: [new Paragraph({ children: [new TextRun({ text, font: 'Arial', size: 20, bold: true, color: WHITE })], alignment: AlignmentType.LEFT })],
  borders: borders(shade),
  shading: { fill: shade, type: ShadingType.CLEAR },
  margins: cellMargins,
  width: { size: width, type: WidthType.DXA },
});

const statusBadge = (text, color) => new Paragraph({
  children: [new TextRun({ text: `  ${text}  `, font: 'Arial', size: 18, bold: true, color: WHITE, highlight: undefined })],
  shading: { fill: color, type: ShadingType.CLEAR },
  spacing: { before: 0, after: 0 },
});

const infoBox = (label, content, color = INDIGO_LIGHT, borderColor = INDIGO) => new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [CONTENT_W],
  rows: [new TableRow({ children: [new TableCell({
    children: [
      new Paragraph({ children: [new TextRun({ text: label, font: 'Arial', size: 20, bold: true, color: borderColor })], spacing: { before: 0, after: 60 } }),
      new Paragraph({ children: [new TextRun({ text: content, font: 'Arial', size: 22, color: BLACK })], spacing: { before: 0, after: 0 } }),
    ],
    borders: { top: border(borderColor), bottom: border(borderColor), left: { style: BorderStyle.SINGLE, size: 12, color: borderColor }, right: border(borderColor) },
    shading: { fill: color, type: ShadingType.CLEAR },
    margins: { top: 120, bottom: 120, left: 180, right: 180 },
  })]})],
});

// ─────────────────────────────────────────────────────────────────────────────
// DOC 1: Product Requirements Document (PRD)
// ─────────────────────────────────────────────────────────────────────────────
async function buildPRD() {
  const children = [
    ...titleBlock(
      'ArcPM',
      'Product Requirements Document (PRD)',
      'Version 1.1  |  Last updated: June 27, 2026  |  Owner: Sara (Program Ops)'
    ),

    H2('1. Overview'),
    P('ArcPM is an AI-powered web application designed for program managers overseeing hardware product development. Unlike traditional project management tools, ArcPM acts as a co-pilot — automatically analyzing changes, surfacing risk, and recommending contingency actions to help teams make faster, better-informed decisions throughout the product lifecycle.'),
    spacer(),

    infoBox('Problem statement',
      'Hardware program managers juggle weekly build status reports, risk registers, certification tracking, and cross-functional launch readiness — often across email, spreadsheets, and slide decks. Critical risks get buried, escalations happen too late, and context is lost between PMs. ArcPM consolidates this into one AI-powered workspace.'),
    spacer(),

    H2('2. Goals & Success Metrics'),
    H3('2.1 Goals'),
    bullet('Reduce time to detect and escalate critical risks from days to minutes'),
    bullet('Give every PM on the team a shared, real-time view of program health'),
    bullet('Replace manual status aggregation with AI-driven analysis from raw updates'),
    bullet('Support multi-program tracking (SR1 v1 → v1.5 → v2) without tool switching'),
    spacer(),

    H3('2.2 Success Metrics — MVP'),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [3600, 3240, 3240],
      rows: [
        new TableRow({ children: [headerCell('Metric', 3600), headerCell('Target', 3240), headerCell('Measurement', 3240)] }),
        ...[
          ['Risk analysis time', '< 30 seconds per change', 'From input to AI result card'],
          ['PM adoption', '3–5 active users within 30 days', 'Supabase auth logins'],
          ['Change log entries', '>10 per week across team', 'change_log table row count'],
          ['Launch readiness accuracy', 'PM rates AI verdict correct ≥80%', 'Qualitative PM survey'],
          ['Time to setup (new PM)', '< 15 minutes', 'Onboarding observation'],
        ].map(([m, t, me], i) => new TableRow({
          children: [
            cell(m, { width: 3600, textOpts: { bold: true }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(t, { width: 3240, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(me, { width: 3240, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
          ]
        }))
      ]
    }),
    spacer(),

    H2('3. Users & Roles'),
    P('ArcPM is built for the SR1 program team of 3–5 PMs, each with a defined role that controls what they see and can edit.'),
    spacer(),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2000, 2000, 3080, 3000],
      rows: [
        new TableRow({ children: [headerCell('Role', 2000), headerCell('Person', 2000), headerCell('Track ownership', 3080), headerCell('Access', 3000)] }),
        ...[
          ['Program Ops', 'Sara', 'All tracks', 'Full access — all views, all edits'],
          ['NPI', 'TBD', 'Hardware, Validation, Regulatory', 'Overview, Timeline, Risks, Cert, Log'],
          ['HW Quality', 'TBD', 'Hardware, Validation', 'Overview, Risk register, Log'],
          ['Marketing', 'TBD', 'GTM, Packaging', 'Overview, Launch readiness, Log'],
          ['Product', 'TBD', 'App, Algorithm', 'Overview, Timeline, Launch, Log'],
        ].map(([r, p, t, a], i) => new TableRow({
          children: [
            cell(r, { width: 2000, textOpts: { bold: true }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(p, { width: 2000, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(t, { width: 3080, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(a, { width: 3000, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
          ]
        }))
      ]
    }),
    spacer(),

    H2('4. Features — MVP Scope'),

    H3('4.1 AI Risk Analysis'),
    bullet('PM enters a change via free text, pasted report, or per-track item selector'),
    bullet('AI (Claude Sonnet) returns: risk score (1–10), risk level, launch slip estimate, affected tracks, contingency actions with owners and deadlines, escalation flag'),
    bullet('All results are saved to the change log with PM attribution'),
    bullet('Context is seeded with real program data (current blockers, CPs, track owners)'),
    spacer(),

    H3('4.2 Program Timeline'),
    bullet('Gantt chart spanning Feb–Oct 2026 for 8 tracks'),
    bullet('Editable end dates per track — changes highlight with dashed bar'),
    bullet('Today marker on timeline'),
    bullet('Edited dates auto-populate the AI analysis input for downstream impact modeling'),
    spacer(),

    H3('4.3 Risk Register'),
    bullet('Full table of all risk items: track, area, status, mitigation, CP date, level'),
    bullet('Live from Supabase — inline editable by authorized roles'),
    bullet('Badge system: Blocker / Critical / Major / Minor / No Risk'),
    bullet('Filtered view per role (NPI sees HW/Validation/Cert; Marketing sees GTM/Packaging)'),
    spacer(),

    H3('4.4 Launch Readiness Tracker'),
    bullet('Four domains: Product & Features, Marketing, Logistics & Supply Chain, Commerce & GTM'),
    bullet('20 checklist items with Go / Watch / No Go status dropdowns'),
    bullet('Live verdict banner: Not Launch Ready / Needs Attention / Launch Ready'),
    bullet('AI analysis of current readiness: verdict, confidence %, blockers, watch items, recommended action'),
    bullet('Role-gated editing: Marketing PM can only update Marketing/Logistics/Commerce domains'),
    spacer(),

    H3('4.5 Certification Tracker'),
    bullet('Cards for: RoHS/CP65/PFAS, EMC/RF, Bluetooth, Energy Efficiency, Medical, BLE Range'),
    bullet('Each card shows status, risk level, target date, and notes'),
    spacer(),

    H3('4.6 Change Log'),
    bullet('Feed of all AI analyses run by the team, ordered newest first'),
    bullet('Each entry shows: PM name, role, input summary, risk score, risk level, timestamp'),
    bullet('Expandable AI result card per entry'),
    bullet('Filterable by PM, risk level, and date range'),
    spacer(),

    H3('4.7 Multi-Program Support'),
    bullet('Program switcher in sidebar (SR1 v1 → v1.5 → v2)'),
    bullet('Each program has independent tracks, risk items, launch items, and change log'),
    bullet('Active program context is passed to all AI calls'),
    spacer(),

    H3('4.8 UI Data Entry (Add / Edit Forms)'),
    bullet('Timeline — add/edit/remove tracks with name, owner, dates, color, and status'),
    bullet('Risks — add/edit/remove risk items with track, area, level, CP, status, mitigation'),
    bullet('Launch — add/edit/remove checklist items per domain with Go/Watch/No Go status'),
    bullet('Certification — add/edit/remove cert cards with priority, status, target, region, notes'),
    bullet('In demo mode, data persists in localStorage per program (survives refresh)'),
    bullet('With Supabase connected, same forms will write to Postgres via API routes'),
    spacer(),

    H2('5. Out of Scope — MVP'),
    bullet('Real-time collaboration (live cursors, websocket sync)'),
    bullet('Slack or email notifications'),
    bullet('Mobile app'),
    bullet('Gantt drag-to-edit'),
    bullet('PDF/PPTX export from within the app'),
    bullet('Custom AI prompt editing by users'),
    spacer(),

    H2('6. Constraints'),
    bullet('Must run on free tiers of Supabase and Vercel at MVP'),
    bullet('Anthropic API key is server-side only — never exposed to client'),
    bullet('No PII beyond name, email, role stored in Supabase'),
    bullet('Auth via Supabase email/password — no OAuth at MVP'),
    spacer(),

    H2('7. Open Questions'),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [500, 5280, 4300],
      rows: [
        new TableRow({ children: [headerCell('#', 500), headerCell('Question', 5280), headerCell('Owner / Target date', 4300)] }),
        ...[
          ['1', 'Should Marketing PM be able to see the risk register in read-only mode?', 'Sara — by Jun 30'],
          ['2', 'Who seeds the initial launch items in Supabase for each new program version?', 'Sara — at program kickoff'],
          ['3', 'What is the escalation workflow when AI flags escalate: true? Email, Slack, or in-app?', 'Team — v1.1'],
          ['4', 'Should change log entries be editable/deletable by the PM who created them?', 'Sara — v1.1'],
        ].map(([n, q, o], i) => new TableRow({
          children: [
            cell(n, { width: 500, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(q, { width: 5280, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(o, { width: 4300, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
          ]
        }))
      ]
    }),
  ];

  const doc = new Document({ styles: STYLES, numbering: NUMBERING, sections: [{ properties: { page: { size: PAGE, margin: MARGINS } }, children }] });
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(OUT, '01-PRD.docx'), buf);
  console.log('✓ 01-PRD.docx');
}

// ─────────────────────────────────────────────────────────────────────────────
// DOC 2: Technical Specification
// ─────────────────────────────────────────────────────────────────────────────
async function buildTechSpec() {
  const children = [
    ...titleBlock(
      'ArcPM',
      'Technical Specification',
      'Version 1.1  |  June 27, 2026  |  Stack: Next.js 14 + Supabase + Anthropic'
    ),

    H2('1. Architecture Overview'),
    P('ArcPM is a full-stack web application built with Next.js 14 App Router. The frontend and backend live in the same repository — API routes are serverless functions co-located with pages. Supabase provides the database, authentication, and row-level security. The Anthropic Claude API powers all AI analysis.'),
    spacer(),

    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2400, 2800, 4880],
      rows: [
        new TableRow({ children: [headerCell('Layer', 2400), headerCell('Technology', 2800), headerCell('Role', 4880)] }),
        ...[
          ['Frontend', 'Next.js 14 (App Router)', 'React pages, client components, routing'],
          ['API', 'Next.js API Routes', 'Serverless functions — AI calls, Supabase CRUD'],
          ['Database', 'Supabase (Postgres)', 'All app data, auth, row-level security'],
          ['AI Engine', 'Anthropic claude-sonnet-4-6', 'Risk analysis, launch readiness verdict'],
          ['Styling', 'Tailwind CSS', 'Utility-first, no CSS files'],
          ['Deployment', 'Vercel', 'CI/CD, serverless, edge CDN'],
          ['Auth', 'Supabase Auth', 'Email/password, JWT tokens, session management'],
        ].map(([l, t, r], i) => new TableRow({
          children: [
            cell(l, { width: 2400, textOpts: { bold: true }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(t, { width: 2800, textOpts: { color: INDIGO }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(r, { width: 4880, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
          ]
        }))
      ]
    }),
    spacer(),

    H2('2. Project Structure'),
    infoBox('Directory layout', [
      'arcpm/',
      '  app/                    Next.js pages + API routes',
      '    api/analyze/          POST — AI risk analysis',
      '    api/analyze-launch/   POST — launch readiness AI',
      '    api/risks/            GET/POST/PATCH — risk items',
      '    api/launch-items/     GET/POST/PATCH — launch items',
      '    api/tracks/           GET/PATCH — track dates',
      '    api/changelog/        GET — change log with user join',
      '    timeline/             Editable Gantt + track add/edit forms',
      '    risks/                Risk register with add/edit forms',
      '    cert/                 Certification cards with add/edit forms',
      '    changelog/            Change log feed with filters',
      '    launch/               Launch readiness page',
      '    login/                Sign-in page (no sidebar)',
      '    page.tsx              Overview (default view)',
      '    layout.tsx            Root layout with AuthProvider',
      '  components/',
      '    AppShell.tsx          Auth gating + sidebar layout',
      '    Sidebar.tsx           Nav, program switcher, track list, user footer',
      '    DemoBanner.tsx        Demo mode banner (shown when DEMO_MODE=true)',
      '    ItemFormCard.tsx      Shared add/edit form card wrapper',
      '    GanttChart.tsx        Reusable timeline component',
      '    AiAnalysisCard.tsx    AI result display card',
      '  lib/',
      '    types.ts              All TypeScript types + ROLE_META + Local* types',
      '    supabase.ts           Supabase client + auth helpers',
      '    anthropic.ts          Anthropic client + system prompts',
      '    AuthContext.tsx       React context — user, profile, programs, active program',
      '    useAccess.ts          Role-based access control hook',
      '    useLocalProgramData.ts  localStorage persistence hook (demo mode)',
      '  supabase/',
      '    schema.sql            Full DB schema — run once in Supabase SQL editor',
      '  .cursorrules            Cursor AI coding conventions',
      '  .env.local.example      Environment variable template',
    ].join('\n')),
    spacer(),

    H2('3. Database Schema'),
    P('All tables are in Supabase (Postgres). Row Level Security (RLS) is enabled on all tables. Authenticated users can read all rows; write policies are enforced at the application layer via the useAccess hook.'),
    spacer(),

    H3('3.1 Tables'),
    ...[
      ['user_profiles', 'id (uuid, FK auth.users), email, full_name, role, created_at', 'Extends Supabase auth. Auto-created via trigger on signup. Role values: program_ops | npi | hw_quality | marketing | product'],
      ['programs', 'id, name, version, launch_target (date), reporter, status, created_at', 'Top-level container. One row per product version (SR1 v1, v1.5, v2). Status: active | archived'],
      ['tracks', 'id, program_id (FK), name, color, status, owner_role, start_date, end_date', 'One row per track per program. Status: on-track | at-risk | critical | blocker. owner_role maps to user role'],
      ['risk_items', 'id, program_id (FK), track, area, status_note, mitigation, level, next_cp, created_by (FK), updated_by (FK), created_at, updated_at', 'Level: blocker | critical | major | minor | no-risk'],
      ['launch_items', 'id, program_id (FK), domain, label, status, owner, note, updated_by (FK), updated_at', 'Domain: product | marketing | logistics | commerce. Status: go | watch | nogo'],
      ['change_log', 'id, program_id (FK), created_by (FK), input_text, input_mode, ai_result (jsonb), risk_score, risk_level, launch_impact_days, created_at', 'ai_result stores the full AiRiskResult JSON blob. mode: text | report | item'],
    ].flatMap(([table, cols, notes]) => [
      H3(table),
      P(cols, { color: SLATE, italic: true }),
      P(notes),
      spacer(),
    ]),

    H2('4. API Routes'),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [1400, 1200, 2000, 5480],
      rows: [
        new TableRow({ children: [headerCell('Method', 1400), headerCell('Route', 1200), headerCell('Body / Params', 2000), headerCell('Returns', 5480)] }),
        ...[
          ['POST', '/api/analyze', '{ input, mode, programId, programContext, userId }', 'AiRiskResult JSON + writes to change_log'],
          ['POST', '/api/analyze-launch', '{ items: LaunchItem[] }', 'AiLaunchResult JSON'],
          ['GET', '/api/risks', '?programId=', 'RiskItem[] ordered by created_at desc'],
          ['POST', '/api/risks', 'RiskItem body', 'Created RiskItem'],
          ['PATCH', '/api/risks', '{ id, ...updates }', 'Updated RiskItem'],
          ['GET', '/api/launch-items', '?programId=', 'LaunchItem[] ordered by domain'],
          ['POST', '/api/launch-items', 'LaunchItem body', 'Created LaunchItem'],
          ['PATCH', '/api/launch-items', '{ id, status }', 'Updated LaunchItem'],
          ['GET', '/api/tracks', '?programId=', 'Track[] ordered by name'],
          ['PATCH', '/api/tracks', '{ id, end_date, status }', 'Updated Track'],
          ['GET', '/api/changelog', '?programId=&limit=50', 'ChangeLogEntry[] with joined user_profiles'],
        ].map(([m, r, b, ret], i) => new TableRow({
          children: [
            cell(m, { width: 1400, textOpts: { bold: true, color: m === 'POST' ? GREEN : m === 'PATCH' ? AMBER : INDIGO }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(r, { width: 1200, textOpts: { color: SLATE }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(b, { width: 2000, textOpts: { size: 18, color: SLATE }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(ret, { width: 5480, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
          ]
        }))
      ]
    }),
    spacer(),

    H2('5. AI Integration'),
    H3('5.1 Risk Analysis — System Prompt'),
    P('The system prompt in lib/anthropic.ts seeds Claude with the current program context (active blockers, checkpoint dates, track owners) and instructs it to return a strict JSON schema. The PM\'s update is sent as the user message. The API key is server-side only — never sent to the client.'),
    spacer(),
    H3('5.2 AI Result Schema'),
    infoBox('AiRiskResult (JSON)', JSON.stringify({
      riskScore: '1–10 integer',
      riskLevel: 'Blocker | Critical | Major | Minor | No Risk',
      launchImpact: 'integer (days of potential slip)',
      pvtImpact: 'yes | no | maybe',
      affectedTracks: '[{ track, severity: low|medium|high, reason, nextCP }]',
      contingencies: '[{ action, owner, priority: P1|P2|P3, deadline }]',
      escalate: 'boolean',
      summary: '2–3 sentence PM-ready summary'
    }, null, 2)),
    spacer(),

    H2('6. Auth & Role-Based Access'),
    H3('6.1 Auth flow'),
    numbered('User goes to /login → enters email + password'),
    numbered('Supabase Auth returns JWT session token'),
    numbered('AuthContext (lib/AuthContext.tsx) loads user profile + all programs from Supabase'),
    numbered('Active program defaults to first program with status = "active"'),
    numbered('AppShell redirects unauthenticated users to /login'),
    spacer(),
    H3('6.2 Access control'),
    P('All access logic lives in lib/useAccess.ts (useAccess hook). It reads the user\'s role from AuthContext and returns: canEditRisks, canEditLaunch, canEditTrack(trackName), canViewPage(slug), canEditLaunchDomain(domain). The UI uses these to show/hide nav items, disable dropdowns, and highlight owned tracks.'),
    spacer(),
    P('Note: RLS in Supabase is set to "authenticated users can read/write all" at MVP. Granular row-level security per role is a v1.1 item.', { color: AMBER }),
    spacer(),

    H2('7. Environment Variables'),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [4000, 2000, 4080],
      rows: [
        new TableRow({ children: [headerCell('Variable', 4000), headerCell('Required', 2000), headerCell('Source', 4080)] }),
        ...[
          ['NEXT_PUBLIC_SUPABASE_URL', 'Yes (prod)', 'Supabase Dashboard → Project Settings → API'],
          ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Yes (prod)', 'Supabase Dashboard → Project Settings → API'],
          ['ANTHROPIC_API_KEY', 'Yes (prod)', 'console.anthropic.com → API Keys'],
          ['NEXT_PUBLIC_DEMO_MODE', 'Optional', 'Set to "true" for local preview without Supabase/Anthropic keys'],
        ].map(([v, r, s], i) => new TableRow({
          children: [
            cell(v, { width: 4000, textOpts: { color: INDIGO }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(r, { width: 2000, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(s, { width: 4080, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
          ]
        }))
      ]
    }),
    spacer(),

    H2('8. Demo Mode & Local Data'),
    P('When NEXT_PUBLIC_DEMO_MODE=true, the app runs without Supabase or Anthropic credentials. AuthContext seeds a demo user (Sara, Program Ops) and three programs. DemoBanner appears at the top of every page.'),
    spacer(),
    P('Timeline, Risks, Launch, and Cert pages store data in localStorage via useLocalProgramData, keyed by active program ID. Data survives browser refresh but is not shared across devices or users. Remove DEMO_MODE and connect Supabase to enable real persistence and AI analysis.'),
    spacer(),

    H2('9. Page Build Status'),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2000, 2000, 6080],
      rows: [
        new TableRow({ children: [headerCell('Page', 2000), headerCell('Route', 2000), headerCell('Status', 6080)] }),
        ...[
          ['Overview', '/', 'Done — change input, AI panel, Gantt snapshot, risk snapshot'],
          ['Timeline', '/timeline', 'Done — Gantt, editable dates, add/edit/remove tracks, track status'],
          ['Risk Register', '/risks', 'Done — full table, add/edit/remove, role-gated editing'],
          ['Launch Readiness', '/launch', 'Done — 4 domains, Go/Watch/No Go, AI verdict, add/edit items'],
          ['Certification', '/cert', 'Done — cert cards, add/edit/remove, role-gated'],
          ['Change Log', '/changelog', 'Done — feed with PM attribution, filters, expandable AI cards'],
          ['Login', '/login', 'Done — email/password via Supabase Auth (bypassed in demo mode)'],
        ].map(([p, r, c], i) => new TableRow({
          children: [
            cell(p, { width: 2000, textOpts: { bold: true }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(r, { width: 2000, textOpts: { color: INDIGO }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(c, { width: 6080, textOpts: { size: 19, color: GREEN }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
          ]
        }))
      ]
    }),
  ];

  const doc = new Document({ styles: STYLES, numbering: NUMBERING, sections: [{ properties: { page: { size: PAGE, margin: MARGINS } }, children }] });
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(OUT, '02-Tech-Spec.docx'), buf);
  console.log('✓ 02-Tech-Spec.docx');
}

// ─────────────────────────────────────────────────────────────────────────────
// DOC 3: User Guide (03-Onboarding-Guide.docx) — source: docs/user-guide.md
// ─────────────────────────────────────────────────────────────────────────────
async function buildOnboarding() {
  const children = [
    ...titleBlock(
      'ArcPM',
      'User Guide',
      'For program teams and Program Ops  |  July 6, 2026  |  Source: docs/user-guide.md'
    ),

    infoBox('Welcome to ArcPM',
      'ArcPM is a general-purpose AI program management workspace. You create programs, invite teammates, and manage timeline, risks, launch readiness, and certifications — scoped per program. This guide covers signup, roles, navigation, and day-to-day use.',
      INDIGO_LIGHT, INDIGO),
    spacer(),

    H2('1. Getting started'),
    numbered('Sign up at /signup and sign in with Google'),
    numbered('Confirm your display name on /onboarding/account'),
    numbered('Create a program (name, optional version/launch date, hardware or empty template) — you become Program Ops'),
    numbered('Or accept an invite on /onboarding/join when email invites ship (Phase 3)'),
    numbered('Optional: invite teammates from /onboarding/invite or Users & roles'),
    spacer(),

    infoBox('Demo mode',
      'Set NEXT_PUBLIC_DEMO_MODE=true to preview the UI without Supabase. Data saves to browser localStorage only; auth and onboarding gates are skipped.',
      INDIGO_LIGHT, INDIGO),
    spacer(),

    H2('2. Programs & program switcher'),
    P('The sidebar dropdown lists every program you belong to. All views — timeline, risks, launch, users, settings — are scoped to the selected program.'),
    bullet('Switch programs — your role may differ per program'),
    bullet('+ New program — create another workspace; you are Program Ops on programs you create'),
    bullet('Launch date appears in the sidebar footer when set'),
    spacer(),

    H2('3. Roles (per program)'),
    P('Roles live on program membership, not your global account. Program Ops manages the team; other roles see a subset of pages and edit rights.'),
    spacer(),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2000, 2200, 5880],
      rows: [
        new TableRow({ children: [headerCell('Role', 2000), headerCell('Label', 2200), headerCell('Typical focus', 5880)] }),
        ...[
          ['program_ops', 'Program Ops', 'Full access — team, settings, all tracks and launch domains'],
          ['npi', 'NPI', 'Hardware / validation / regulatory tracks and risks'],
          ['hw_quality', 'HW Quality', 'Hardware / validation risks'],
          ['marketing', 'Marketing', 'GTM / packaging tracks; Marketing, Logistics, Commerce launch'],
          ['product', 'Product', 'App / algorithm tracks; Product launch domain'],
        ].map(([r, l, f], i) => new TableRow({
          children: [
            cell(r, { width: 2000, textOpts: { bold: true, color: INDIGO }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(l, { width: 2200, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(f, { width: 5880, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
          ]
        }))
      ]
    }),
    spacer(),

    H2('4. For Program Ops — team & settings'),
    H3('Users & roles (/users)'),
    bullet('View members on the active program and change roles from the dropdown'),
    bullet('Copy signup link when you are the only member (email invites in Phase 3)'),
    bullet('Role changes apply only to the active program'),
    spacer(),
    H3('Program settings (/program/settings)'),
    bullet('Set timeline start, end, and launch target — drives the Gantt chart span'),
    bullet('Define Components — workstream taxonomy for tracks (e.g. Frontend, Backend, Hardware)'),
    spacer(),

    H2('5. Navigating the app'),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2500, 7580],
      rows: [
        new TableRow({ children: [headerCell('View', 2500), headerCell('What it does', 7580)] }),
        ...[
          ['Overview', 'Log a change, run AI risk analysis, see timeline and risk snapshots'],
          ['Timeline', 'Gantt chart — add, edit, remove tracks; delayed dates show a Delayed badge'],
          ['Risk register', 'Full risk table — level, component, mitigation, next checkpoint'],
          ['Launch readiness', 'Go / Watch / No Go across Product, Marketing, Logistics, Commerce'],
          ['Certification', 'Regulatory cert cards with status and target dates'],
          ['Change log', 'History of AI analyses with input and results'],
          ['Users & roles', 'Team and roles (Program Ops only)'],
          ['Program settings', 'Timeline dates and Components (Program Ops only)'],
        ].map(([v, w], i) => new TableRow({
          children: [
            cell(v, { width: 2500, textOpts: { bold: true }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(w, { width: 7580, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
          ]
        }))
      ]
    }),
    spacer(),

    spacer(),

    H2('Gantt chart legend'),
    P('On Timeline (and the Overview snapshot), the Gantt chart uses these visual cues:'),
    spacer(),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [3200, 6880],
      rows: [
        new TableRow({ children: [headerCell('Symbol', 3200), headerCell('Meaning', 6880)] }),
        ...[
          ['Indigo vertical line', 'Today — current date on the chart'],
          ['Green vertical line', 'Launch target — program launch date from Program settings'],
          ['Dashed outline on a bar', 'Date changed — track end date was edited after creation'],
          ['Red outline on a bar', 'Delayed — end date is in the past and the track is not complete'],
          ['Grey bar', 'Complete — track marked complete (muted fill)'],
        ].map(([s, m], i) => new TableRow({
          children: [
            cell(s, { width: 3200, textOpts: { bold: true }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(m, { width: 6880, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
          ]
        }))
      ]
    }),
    P('The same legend appears below the chart on the Timeline page. The tracks table also shows a Delayed badge when a track is overdue.'),
    spacer(),

    H2('6. Log your first change'),
    numbered('Go to Overview'),
    numbered('Choose Free text, Paste report, or By risk item'),
    numbered('Describe what changed — include dates, parts, and dependencies when possible'),
    numbered('Click Analyze risk'),
    numbered('Review risk score, launch impact, affected tracks, and contingency actions'),
    numbered('Result saves to Change log with your name'),
    spacer(),

    H3('Tips for better AI output'),
    bullet('Be specific — numbers, dates, named dependencies'),
    bullet('Paste full emails or reports in Paste report mode'),
    bullet('Use By risk item for targeted updates on known issues'),
    bullet('Requires ANTHROPIC_API_KEY or GEMINI_API_KEY on the server'),
    spacer(),

    H2('7. Add and edit program data'),
    numbered('Program settings — set timeline dates; add Components (Program Ops)'),
    numbered('Timeline — + Add track: name, component, dates, status'),
    numbered('Risks — + Add risk: track, area/component, level, mitigation'),
    numbered('Launch readiness — + Add item per domain; set Go / Watch / No Go'),
    numbered('Certification — + Add certification with type, priority, status, target date'),
    numbered('Edit and Remove on any row or card to update or delete'),
    spacer(),

    infoBox('Data persistence',
      'Demo mode: localStorage in this browser, per program. Production: program metadata and components in Supabase; some pages may still use localStorage until Phase 4 — see project-tasks.md.',
      INDIGO_LIGHT, INDIGO),
    spacer(),

    H2('8. Role permissions reference'),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2000, 2800, 2640, 2640],
      rows: [
        new TableRow({ children: [headerCell('Role', 2000), headerCell('Tracks owned', 2800), headerCell('Edit risks?', 2640), headerCell('Edit launch?', 2640)] }),
        ...[
          ['Program Ops', 'All', 'Yes — all', 'Yes — all domains'],
          ['NPI', 'Hardware, Validation, Regulatory', 'Yes — owned', 'No'],
          ['HW Quality', 'Hardware, Validation', 'Yes — owned', 'No'],
          ['Marketing', 'GTM, Packaging', 'No', 'Yes — Mktg, Logistics, Commerce'],
          ['Product', 'App, Algorithm', 'No', 'Yes — Product'],
        ].map(([r, t, er, el], i) => new TableRow({
          children: [
            cell(r, { width: 2000, textOpts: { bold: true }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(t, { width: 2800, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(er, { width: 2640, textOpts: { color: er === 'No' ? RED : GREEN }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(el, { width: 2640, textOpts: { color: el === 'No' ? RED : GREEN }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
          ]
        }))
      ]
    }),
    spacer(),

    H2('9. Help & support'),
    bullet('Wrong role or missing page → ask Program Ops on your program'),
    bullet('Cannot see a program → request membership from the program creator'),
    bullet('AI analysis fails → confirm API keys; add more context to input'),
    bullet('App errors → status.supabase.com'),
  ];

  const doc = new Document({ styles: STYLES, numbering: NUMBERING, sections: [{ properties: { page: { size: PAGE, margin: MARGINS } }, children }] });
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(OUT, '03-Onboarding-Guide.docx'), buf);
  console.log('✓ 03-Onboarding-Guide.docx');
}

// ─────────────────────────────────────────────────────────────────────────────
// DOC 4: Project Tracker — Build Log & Decision Record
// ─────────────────────────────────────────────────────────────────────────────
async function buildTracker() {
  const children = [
    ...titleBlock(
      'ArcPM',
      'Project Tracker — Build Log & Decision Record',
      'Living document  |  Updated June 27, 2026  |  Owner: Sara'
    ),

    infoBox('How to use this document',
      'This is a living tracker. Update the Build Log every time you complete a milestone or ship a new feature. Update the Decision Log every time a meaningful architectural or product decision is made. Update the Roadmap when scope changes.',
      INDIGO_LIGHT, INDIGO),
    spacer(),

    H2('Current Status'),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [3000, 3000, 4080],
      rows: [
        new TableRow({ children: [headerCell('Item', 3000), headerCell('Status', 3000), headerCell('Notes', 4080)] }),
        ...[
          ['Prototype (interactive demo)', 'Done ✓', 'Built in Claude.ai — 5 views, full AI integration'],
          ['Stack decision', 'Done ✓', 'Next.js 14 + Supabase + Anthropic'],
          ['Multi-user design', 'Done ✓', '5 roles, auth, program switcher'],
          ['Scaffold generated', 'Done ✓', '30+ files — pages, API routes, lib, schema'],
          ['All MVP pages built', 'Done ✓', 'Overview, Timeline, Risks, Launch, Cert, Changelog, Login'],
          ['UI add/edit forms', 'Done ✓', 'Timeline, Risks, Launch, Cert — ItemFormCard + localStorage'],
          ['Demo mode', 'Done ✓', 'NEXT_PUBLIC_DEMO_MODE — preview without Supabase/Anthropic keys'],
          ['Production build', 'Done ✓', 'npm run build passes — 16 routes'],
          ['Supabase setup', 'To do', 'Create project, run schema.sql, invite team'],
          ['Vercel deployment', 'To do', 'Connect repo, add env vars, disable demo mode'],
          ['Wire forms to Supabase', 'To do', 'Replace localStorage with API routes on Timeline/Risks/Launch/Cert'],
          ['Team onboarding', 'To do', 'Invite 4 PMs via Supabase Auth'],
          ['Onboarding workflow plan', 'Done ✓', 'Reviewed — v2 in onboarding-workflow-plan.md (state machine, schema delta, templates)'],
          ['Program membership model', 'To do', 'Phase 1: program_members, program_invites, RLS, onboarding gates'],
        ].map(([item, status, notes], i) => {
          const statusColor = status.includes('Done') ? GREEN : status === 'In progress' ? AMBER : SLATE;
          return new TableRow({
            children: [
              cell(item, { width: 3000, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
              cell(status, { width: 3000, textOpts: { bold: true, color: statusColor }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
              cell(notes, { width: 4080, textOpts: { size: 20, color: SLATE }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            ]
          });
        })
      ]
    }),
    spacer(),

    H2('Build Log'),
    H3('June 2026'),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [1400, 2400, 6280],
      rows: [
        new TableRow({ children: [headerCell('Date', 1400), headerCell('Who', 2400), headerCell('What was built / decided', 6280)] }),
        ...[
          ['Jun 26', 'Sara', 'Prototype v1 built in Claude.ai — 3-tab change input, AI risk panel, Gantt timeline, risk register'],
          ['Jun 26', 'Sara', 'Uploaded SR1-Program_Build_Status_Live.pdf — AI context updated with DVT1.2 real risk data'],
          ['Jun 26', 'Sara', 'Prototype v2 — added launch readiness view with 4 domains, live Go/Watch/No Go tracker, AI verdict'],
          ['Jun 26', 'Sara', 'Architecture decision — Next.js 14 + Supabase + Anthropic. Solo use initially.'],
          ['Jun 26', 'Sara', 'Expanded to 3–5 PM team. 5 roles defined: program_ops, npi, hw_quality, marketing, product'],
          ['Jun 26', 'Sara', 'Full scaffold generated — 30 files including schema.sql, API routes, auth, role access control'],
          ['Jun 26', 'Sara', 'Added config files for Cursor: .cursorrules, tsconfig.json, tailwind.config.ts, next.config.js'],
          ['Jun 26', 'Sara', 'Packed all files into arcpm-cursor.zip for import into Cursor'],
          ['Jun 28', 'Product', 'Onboarding plan v2 — state machine, schema delta, program templates, MVP decisions'],
          ['Jun 27', 'Sara + Cursor', 'Built all remaining MVP pages: /timeline, /risks, /cert, /changelog'],
          ['Jun 27', 'Sara + Cursor', 'Production build verified — 16 routes, no type/lint errors'],
          ['Jun 27', 'Sara + Cursor', 'Removed hardcoded SR1 demo seed data — pages start empty in demo mode'],
          ['Jun 27', 'Sara + Cursor', 'Added UI add/edit forms on Timeline, Risks, Launch, Cert (ItemFormCard)'],
          ['Jun 27', 'Sara + Cursor', 'Added useLocalProgramData hook — localStorage persistence per program in demo mode'],
          ['Jun 27', 'Sara + Cursor', 'Added track status field to Timeline add/edit form and table'],
          ['Jun 27', 'Sara + Cursor', 'Updated docs/ — PRD, Tech Spec, Onboarding, Project Tracker regenerated'],
          ['Jul 6', 'Sara + Cursor', 'Rewrote user guide — docs/user-guide.md + 03-Onboarding-Guide.docx (multi-program, per-program roles, Program settings; removed SR1/workspace-admin copy)'],
          ['—', '—', '← Add your next entry here'],
        ].map(([d, w, what], i) => new TableRow({
          children: [
            cell(d, { width: 1400, textOpts: { size: 20, color: SLATE }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(w, { width: 2400, textOpts: { bold: true }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(what, { width: 6280, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
          ]
        }))
      ]
    }),
    spacer(),

    H2('Decision Log'),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [1200, 2000, 3240, 3640],
      rows: [
        new TableRow({ children: [headerCell('Date', 1200), headerCell('Decision', 2000), headerCell('Rationale', 3240), headerCell('Alternatives considered', 3640)] }),
        ...[
          ['Jun 26', 'Next.js 14 + Supabase', 'Single repo for frontend and API, Supabase free tier, auth-ready, Postgres gives flexibility', 'React + FastAPI (more overhead), Remix (smaller ecosystem for this use case)'],
          ['Jun 26', 'Role-based access at app layer (not RLS)', 'Faster to ship at MVP, RLS can be added in v1.1 without schema changes', 'Full Supabase RLS per role (more complex, slower to iterate)'],
          ['Jun 26', 'claude-sonnet-4-6 for AI', 'Best balance of speed and quality for structured JSON outputs; cost-effective for a small team', 'claude-opus (too expensive for frequent calls), GPT-4o (no existing Anthropic API key)'],
          ['Jun 26', '5 fixed roles (not RBAC config)', 'Team is small and stable; configurable roles add complexity for no near-term benefit', 'Custom role builder in UI (post-MVP roadmap item)'],
          ['Jun 26', 'Program switcher in sidebar', 'PMs need to work on v1 now and transition to v1.5/v2 later without a new tool', 'Separate deployments per program (too much ops overhead)'],
          ['Jun 27', 'localStorage for demo data', 'Ship MVP UI without Supabase; swap to API routes when backend is live', 'In-memory only (lost on refresh)'],
          ['Jun 27', 'Shared ItemFormCard component', 'Consistent add/edit UX across 4 pages; one form pattern to maintain', 'Inline forms per page with duplicated markup'],
          ['—', '← Add next decision', '', ''],
        ].map(([d, dec, rat, alt], i) => new TableRow({
          children: [
            cell(d, { width: 1200, textOpts: { size: 20, color: SLATE }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(dec, { width: 2000, textOpts: { bold: true }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(rat, { width: 3240, textOpts: { size: 20 }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(alt, { width: 3640, textOpts: { size: 20, color: SLATE }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
          ]
        }))
      ]
    }),
    spacer(),

    H2('Roadmap'),
    H3('MVP (current — shipped in app)'),
    bullet('AI risk analysis — free text, paste report, by risk item'),
    bullet('Program timeline — Gantt Feb–Oct 2026, editable dates, add/edit tracks'),
    bullet('Risk register — live table with add/edit/remove'),
    bullet('Launch readiness — 4 domains, Go/Watch/No Go, AI verdict, add/edit items'),
    bullet('Certification tracker — add/edit cert cards'),
    bullet('Change log — feed with PM attribution and filters'),
    bullet('Multi-user auth — 5 roles, program switcher (demo mode for local preview)'),
    bullet('Demo mode — preview app without Supabase/Anthropic keys'),
    spacer(),
    H3('v1.1 — Production launch'),
    bullet('Supabase setup — run schema.sql, seed SR1 data, invite team'),
    bullet('Vercel deployment — connect repo, set env vars, disable demo mode'),
    bullet('Wire Timeline/Risks/Launch/Cert forms to Supabase API routes'),
    bullet('Supabase RLS per role — replace app-layer access control'),
    bullet('Slack/email alert when AI flags escalate: true'),
    spacer(),
    H3('v1.2 — Team feedback round'),
    bullet('Multi-program support fully tested (SR1 v1.5 kickoff)'),
    bullet('PDF / PPTX export of risk register or launch readiness'),
    bullet('CP (checkpoint) calendar view'),
    bullet('AI prompt customization per program'),
    spacer(),
    H3('v2 — Scale'),
    bullet('Real-time collaboration (Supabase Realtime)'),
    bullet('Mobile-responsive layout'),
    bullet('Configurable role builder'),
    bullet('Integration with Jira or Linear for risk item sync'),
    bullet('AI-generated weekly program digest email'),
  ];

  const doc = new Document({ styles: STYLES, numbering: NUMBERING, sections: [{ properties: { page: { size: PAGE, margin: MARGINS } }, children }] });
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(OUT, '04-Project-Tracker.docx'), buf);
  console.log('✓ 04-Project-Tracker.docx');
}

// ─────────────────────────────────────────────────────────────────────────────
// DOC 5: Onboarding Workflow Plan (product / engineering)
// ─────────────────────────────────────────────────────────────────────────────
async function buildOnboardingWorkflowPlan() {
  const children = [
    ...titleBlock(
      'ArcPM',
      'Onboarding Workflow Plan',
      'Status: Planning (reviewed)  |  Last updated: June 28, 2026  |  Source: docs/onboarding-workflow-plan.md'
    ),

    infoBox('Purpose',
      'This document defines the target onboarding experience for ArcPM. ArcPM is a general-purpose AI-powered program management tool — not a single-product workspace. Users create their own programs and teams. SR1 in the codebase is example/demo seed data only.',
      INDIGO_LIGHT, INDIGO),
    spacer(),

    H2('1. Three questions onboarding must answer'),
    numbered('Who are you? (account identity)'),
    numbered('Which program are you working on? (create one or join via invite)'),
    numbered('What\'s your role on that program? (assigned by inviter, or Program Ops if you created it)'),
    spacer(),

    H2('2. Product model shift'),
    H3('Today (implicit shared workspace)'),
    bullet('Programs seeded in SQL (SR1); all authenticated users see all programs'),
    bullet('Role is global on user_profiles.role'),
    bullet('Onboarding = pick name + self-select role → enter shared workspace'),
    bullet('No UI to create a program'),
    spacer(),
    H3('Target (user-owned workspaces)'),
    bullet('Users create programs; all data scoped per program via membership'),
    bullet('Role lives on program_members.role (per program)'),
    bullet('Onboarding = account setup → create program OR accept invite'),
    bullet('Program Ops invites teammates by email with role + program'),
    spacer(),

    H2('3. Target data model'),
    P('Core relationships: auth.users → user_profiles → program_members → programs → tracks / risks / launch / changelog (all keyed by program_id).'),
    spacer(),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2800, 7280],
      rows: [
        new TableRow({ children: [headerCell('Table', 2800), headerCell('Purpose', 7280)] }),
        ...[
          ['user_profiles', 'Account: full_name, account_setup_complete, last_active_program_id (no global role)'],
          ['programs', 'User-created: name, version, created_by, template (hardware|empty), launch_target'],
          ['program_members', 'Active membership + role per program'],
          ['program_invites', 'Pending invites: email, role, token, expires_at — MVP decided approach'],
        ].map(([t, p], i) => new TableRow({
          children: [
            cell(t, { width: 2800, textOpts: { bold: true, color: INDIGO }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(p, { width: 7280, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
          ]
        }))
      ]
    }),
    spacer(),

    H2('4. Two onboarding paths'),
    H3('Path A — Program creator (no invite)'),
    numbered('Sign up with Google'),
    numbered('Account setup — full name only'),
    numbered('Create program — name, optional version, optional launch target'),
    numbered('Auto-assigned program_ops on that program'),
    numbered('Invite team (skippable)'),
    numbered('Land on Overview with creator empty states'),
    spacer(),
    H3('Path B — Invitee'),
    numbered('Sign up / sign in via invite link'),
    numbered('Account setup — confirm name'),
    numbered('Join preview — program name + assigned role (no self-select)'),
    numbered('Accept → active membership'),
    numbered('Land on role-appropriate home page'),
    spacer(),

    H2('5. Onboarding routes'),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [3200, 2400, 4480],
      rows: [
        new TableRow({ children: [headerCell('Route', 3200), headerCell('Audience', 2400), headerCell('Purpose', 4480)] }),
        ...[
          ['/signup, /login', 'All', 'Authentication'],
          ['/onboarding/account', 'New users', 'Name, optional avatar'],
          ['/onboarding/create-program', 'Creators', 'First workspace setup'],
          ['/onboarding/join', 'Invitees', 'Confirm membership + role'],
          ['/onboarding/invite', 'Creators', 'Optional team invites (skippable)'],
          ['/', 'All', 'App home after onboarding complete'],
        ].map(([r, a, p], i) => new TableRow({
          children: [
            cell(r, { width: 3200, textOpts: { color: INDIGO }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(a, { width: 2400, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(p, { width: 4480, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
          ]
        }))
      ]
    }),
    spacer(),

    H2('6. Onboarding state machine'),
    P('Evaluate gates in priority order: (1) account setup → (2) invite join → (3) create program → (4) app home.'),
    bullet('needsAccountSetup = account_setup_complete is false (always show confirm-name step for new users)'),
    bullet('needsInviteAcceptance = valid program_invites row for user email'),
    bullet('needsProgramSetup = zero active memberships and no pending invite'),
    bullet('Fully onboarded = account_setup_complete AND ≥1 active program_members row'),
    spacer(),

    H2('7. Program templates & roles'),
    P('MVP ships one template: hardware (default five roles + track seed). Empty template optional. Roles are per program via program_members.'),
    spacer(),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2000, 8080],
      rows: [
        new TableRow({ children: [headerCell('Role', 2000), headerCell('Notes', 8080)] }),
        ...[
          ['program_ops', 'Full access; can invite and manage team on this program'],
          ['npi', 'Hardware, Validation, Regulatory tracks; Timeline, Risks, Cert'],
          ['hw_quality', 'Hardware, Validation; Risk register focus'],
          ['marketing', 'GTM, Packaging; Launch readiness (Marketing/Logistics/Commerce)'],
          ['product', 'App, Algorithm; Timeline + Launch (Product domain)'],
        ].map(([r, n], i) => new TableRow({
          children: [
            cell(r, { width: 2000, textOpts: { bold: true }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(n, { width: 8080, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
          ]
        }))
      ]
    }),
    spacer(),

    H2('8. Program creation (MVP)'),
    bullet('Required: program name, user display name (from account step)'),
    bullet('Optional: version label, launch target date'),
    bullet('On create: program + program_members (creator = program_ops); hardware template seeds tracks'),
    bullet('Persist last_active_program_id on user_profiles'),
    bullet('SR1 seed data → demo/sample loader only, not default for new users'),
    spacer(),

    H2('9. Invite flow'),
    bullet('Program Ops invites from /onboarding/invite and /users'),
    bullet('Payload: program_id, email, role, invited_by'),
    bullet('Invitee link → /onboarding/join?token=... → accept → active member'),
    bullet('MVP: invite-only (no public program join links)'),
    spacer(),

    H2('10. Post-onboarding landing'),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [3000, 7080],
      rows: [
        new TableRow({ children: [headerCell('Role', 3000), headerCell('Suggested first page', 7080)] }),
        ...[
          ['program_ops', 'Overview'],
          ['npi', 'Timeline'],
          ['hw_quality', 'Risk register'],
          ['marketing', 'Launch readiness'],
          ['product', 'Overview or Timeline'],
        ].map(([r, p], i) => new TableRow({
          children: [
            cell(r, { width: 3000, textOpts: { bold: true }, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(p, { width: 7080, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
          ]
        }))
      ]
    }),
    spacer(),

    H2('11. Empty states (new programs)'),
    bullet('Overview — "Log your first change to get AI risk analysis"'),
    bullet('Users — "Invite your first teammate"'),
    bullet('Timeline — "Add tracks to plan your program" (if not auto-seeded)'),
    P('Invitees joining existing programs skip creator empty states.'),
    spacer(),

    H2('12. Changes from current implementation'),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [4000, 6080],
      rows: [
        new TableRow({ children: [headerCell('Current', 4000), headerCell('Target', 6080)] }),
        ...[
          ['Signup: "Enter SR1 workspace"', 'Create a program or join your team'],
          ['Global role on user_profiles', 'Role on program_members per program'],
          ['getPrograms() returns all', 'Filter by membership'],
          ['Open /signup for team growth', 'Invite by email from /users'],
          ['user_metadata.onboarded flag', 'Derived from account + membership state'],
          ['Sidebar during onboarding', 'Hidden on auth/onboarding routes'],
        ].map(([c, t], i) => new TableRow({
          children: [
            cell(c, { width: 4000, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
            cell(t, { width: 6080, shading: i % 2 === 0 ? SLATE_LIGHT : WHITE }),
          ]
        }))
      ]
    }),
    spacer(),

    H2('10. Decided for MVP'),
    bullet('Multi-program per user: yes'),
    bullet('Default template: hardware (seed tracks)'),
    bullet('Join model: invite-only via program_invites + token URL'),
    bullet('Signup: Google OAuth; active program in last_active_program_id'),
    bullet('Creator becomes program_ops on their program only'),
    spacer(),

    H2('11. Build phases'),
    H3('Phase 1 — Schema + routing fork'),
    bullet('program_members table + RLS by membership'),
    bullet('Migrate role off user_profiles'),
    bullet('Account + create/join onboarding fork'),
    spacer(),
    H3('Phase 2 — Create program'),
    bullet('Create program API + UI, creator = program_ops'),
    bullet('Program-scoped AuthContext and useAccess()'),
    bullet('Empty states'),
    spacer(),
    H3('Phase 3 — Invites'),
    bullet('Invite API, join/accept flow, /users invite UI'),
    spacer(),
    H3('Phase 4 — Polish'),
    bullet('Multi-program switcher, track templates, SR1 demo loader, role landing hints'),
    spacer(),

    H2('12. Open questions (remaining)'),
    bullet('Email delivery for invites (Resend vs edge function vs copy link)'),
    bullet('Deprecate programs.reporter field'),
    bullet('Remove email/password login UI or keep for legacy'),
  ];

  const doc = new Document({ styles: STYLES, numbering: NUMBERING, sections: [{ properties: { page: { size: PAGE, margin: MARGINS } }, children }] });
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(OUT, '05-Onboarding-Workflow-Plan.docx'), buf);
  console.log('✓ 05-Onboarding-Workflow-Plan.docx');
}

// ─── Run all ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('Building ArcPM documents...');
  await Promise.all([buildPRD(), buildTechSpec(), buildOnboarding(), buildTracker(), buildOnboardingWorkflowPlan()]);
  console.log('\nAll documents written to docs/');
}

main().catch(e => { console.error(e); process.exit(1); });
