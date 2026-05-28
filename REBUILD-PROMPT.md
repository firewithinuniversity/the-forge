# The Forge v2 — Complete Rebuild Prompt

Paste everything below this line into a fresh Claude Code session opened at:
`C:\Users\bbreu\OneDrive\Documents\Coding Projects\the-forge`

---

## Who we are

Brett and Jude run a ministry called Fire Within University. **The Forge** is our internal project-management and finance-tracking dashboard — only we two use it. It's currently a barebones Next.js app with a kanban board. We need it rebuilt into a professional, clean dashboard that also tracks our finances (replacing our Excel spreadsheet) and gives us project timeline visibility.

## What already exists (keep the data layer, rebuild the UI)

The v1 app is scaffolded at this directory with:

- **Next.js 16.2.6** (App Router), React 19, TypeScript 5
- **Tailwind CSS 4** (PostCSS plugin, no tailwind.config — uses CSS-based config in `app/globals.css`)
- **Prisma 7.8** with SQLite (`prisma/schema.prisma`) — models: Project, Phase, Task, Note
- **API routes** already working: `/api/projects`, `/api/tasks`, `/api/phases`
- Runs on `localhost:3001` (port 3001 to avoid conflicts)

**Keep:** Prisma schema (extend it), API routes (extend them), prisma.config.ts, lib/prisma.ts, package.json base deps.
**Replace:** All UI components, layout, page files, globals.css.

---

## Design Direction — Linear / Vercel-inspired dark dashboard

### Layout Architecture
- **Persistent left sidebar** (260px wide, collapsible to 64px icon-only on mobile)
  - Logo/app name at top ("The Forge" with a small anvil or hammer icon)
  - Nav sections: Dashboard, Projects, Finance, Timeline, Notes
  - User avatars at bottom (Brett + Jude — hardcoded, no auth needed)
  - Active nav item: subtle left border accent + background highlight
- **Main content area** fills remaining width
  - Top: contextual breadcrumb + page title + action buttons (right-aligned)
  - KPI strip below header (4 cards in a row on desktop, 2x2 on tablet, stack on mobile)
  - Content grid below KPIs

### Color System (dark mode only — no light mode needed)
```
Base/Background:    #0A0A0F   (near-black with slight blue undertone)
Surface/Card:       #111118   (elevated surface)
Elevated/Hover:     #1A1A24   (modal, dropdown, hover states)
Border:             #262630   (subtle borders)
Border Hover:       #3A3A48   (interactive borders)
Text Primary:       #EEEEF0   (headings, important text)
Text Secondary:     #9090A0   (descriptions, metadata)
Text Tertiary:      #606070   (timestamps, disabled)
Accent Primary:     #E8A020   (amber/gold — our brand color, use for primary buttons, active states)
Accent Hover:       #F0B040   (lighter amber for hover)
Success:            #22C55E   (green — completed, income)
Warning:            #F59E0B   (amber — in progress, pending)
Danger:             #EF4444   (red — overdue, expenses, urgent)
Info:               #3B82F6   (blue — informational badges)
```

### Typography
- Font: **Inter** (already installed via Google Fonts)
- Headings: font-semibold, tracking-tight
- Body: font-normal, text-sm (14px) as default
- Small/metadata: text-xs (12px)
- Page titles: text-2xl (24px)
- KPI numbers: text-3xl font-bold tabular-nums

### Component Patterns
- **Cards**: rounded-xl, bg-[#111118], border border-[#262630], p-5. On hover: border-[#3A3A48] transition
- **Buttons**: rounded-lg, text-sm font-medium. Primary: bg-amber-500 hover:bg-amber-400 text-black. Secondary: bg-[#1A1A24] border border-[#262630] text-[#EEEEF0]
- **Badges/Pills**: rounded-full px-2.5 py-0.5 text-xs font-medium. Color-coded by status/priority
- **Tables**: no visible borders between rows — use alternating subtle bg or hover highlight. Header row text-xs uppercase tracking-wider text-[#606070]
- **Inputs**: bg-[#111118] border border-[#262630] rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30
- **Modals**: centered overlay with bg-black/60 backdrop. Modal card: bg-[#111118] rounded-2xl border border-[#262630] shadow-2xl max-w-lg
- **Empty states**: centered icon + message + CTA button, muted colors
- **Transitions**: all interactive elements get `transition-colors duration-150` or `transition-all duration-200`

---

## Features to Build

### 1. Dashboard (home page `/`)
- KPI strip: Total Projects (active), Tasks This Week, Monthly Income, Monthly Expenses
- Recent activity feed (last 10 task updates across all projects)
- Quick-add buttons: New Task, New Project, Log Transaction
- Project cards grid showing active projects with progress bars (tasks done / total)

### 2. Projects (`/projects` list, `/projects/[id]` detail)
**List view:**
- Card grid of all projects. Each card shows: name, color dot, description snippet, phase name, task count, progress bar, dates
- Filter bar: status (active/completed/archived), assignee, search
- Sort by: name, created date, due date, progress

**Detail view:**
- Project header: name, description (editable inline), color, date range, phase badge
- Tabbed content:
  - **Board** tab: Kanban columns (Todo, In Progress, Review, Done) — drag-and-drop with task cards
  - **List** tab: Table view of all tasks with sortable columns
  - **Timeline** tab: Gantt-style horizontal bar chart showing task durations (see Timeline section)
  - **Notes** tab: Freeform notes list with rich text (markdown support)

**Task cards** (used in Board and List):
- Title, priority badge (color-coded), assignee avatar, due date
- Click to open task detail modal for editing
- Quick status change via dropdown or drag

### 3. Finance Tracking (`/finance`)
This replaces our Excel spreadsheet. We need to track income and expenses for the ministry.

**New Prisma models needed:**
```prisma
model Transaction {
  id          String   @id @default(cuid())
  type        String   // "income" | "expense"
  amount      Float    // always positive, type determines direction
  description String
  category    String   // from Category model
  date        DateTime
  projectId   String?  // optional link to a project
  recurring   Boolean  @default(false)
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project     Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
}

model Category {
  id    String @id @default(cuid())
  name  String @unique
  type  String // "income" | "expense" | "both"
  color String @default("#9090A0")
  icon  String? // emoji or icon name
}

model Budget {
  id         String @id @default(cuid())
  categoryId String
  amount     Float
  month      Int    // 1-12
  year       Int
  createdAt  DateTime @default(now())

  @@unique([categoryId, month, year])
}
```

**Finance page layout:**
- **Top KPI strip**: Total Income (this month), Total Expenses (this month), Net (income - expenses), Year-to-Date Net
- **Chart section**: Monthly income vs expenses bar chart (last 12 months). Use a lightweight chart library — recommend **recharts** (already React-based, tree-shakeable)
- **Transaction table** below chart:
  - Columns: Date, Description, Category, Project (if linked), Amount (green for income, red for expense)
  - Filter by: type (income/expense/all), category, project, date range
  - Sort by any column
  - Inline add row at top
  - Bulk select + delete
- **Sidebar panel** (right side, collapsible): Category breakdown pie chart, top spending categories

**Seed default categories:**
- Income: Donations, Course Sales, Merchandise, Other Income
- Expense: Software/Tools, Hosting, Marketing, Equipment, Travel, Ministry Supplies, Other Expense

### 4. Excel/CSV Export
- Add **Export** button on Finance page (top right, next to "Add Transaction")
- Export formats: `.xlsx` (Excel) and `.csv`
- Use **SheetJS (`xlsx` package)** for Excel generation — install it: `npm install xlsx`
- Export should include:
  - All transactions matching current filters
  - Sheet name: "Transactions"
  - Headers: Date, Type, Description, Category, Project, Amount, Notes
  - Summary row at bottom: Total Income, Total Expenses, Net
  - Second sheet "Monthly Summary" with month-by-month totals
- CSV export is just the transaction sheet, comma-separated
- File naming: `forge-finance-export-YYYY-MM-DD.xlsx`

### 5. Project Timeline (`/timeline` global, or per-project tab)
- Horizontal Gantt-style chart showing project phases and tasks over time
- Each project is a swimlane, phases are grouped bars, tasks are individual bars within
- Color-coded by status (todo=gray, in progress=blue, review=amber, done=green)
- Today line (vertical dashed line)
- Zoom controls: week / month / quarter view
- Click a bar to open task/phase detail

**Implementation**: Build a custom Gantt component using plain divs + CSS Grid (no heavy library needed for our scale). Each row is a flex container, bars are absolutely positioned based on start/end dates relative to the visible date range.

**Schema additions needed:**
```prisma
// Add to existing Task model:
  startDate   DateTime?
  endDate     DateTime?  // rename dueDate → endDate, keep dueDate as alias

// Add to existing Phase model:
  startDate   DateTime?
  endDate     DateTime?
```

### 6. Notes (`/notes`)
- Global notes page showing all notes across projects
- Filter by project
- Markdown rendering (use `react-markdown` — install it)
- Create/edit notes with a simple textarea (no WYSIWYG needed)

### 7. Sidebar Navigation Component
Build a reusable `Sidebar` component:
- Fixed position on desktop (260px), slides in from left on mobile (overlay with backdrop)
- Nav items with icons (use simple SVG icons — no icon library needed, just inline SVGs)
- Sections: Main (Dashboard), Work (Projects, Timeline), Finance (Transactions, Budgets), Other (Notes)
- Active state: left-3 border-amber-500, bg-[#1A1A24], text-white
- Collapsed state on mobile: hamburger toggle in top-left

---

## API Routes Needed

Extend the existing API routes and add new ones:

```
GET/POST   /api/projects          (exists — enhance with finance relation)
GET/PATCH/DELETE /api/projects/[id] (exists — add timeline fields)
GET/POST   /api/tasks             (POST exists — add GET with filters)
PATCH/DELETE /api/tasks/[id]       (exists — add startDate/endDate)
POST       /api/phases            (exists — add startDate/endDate)
PATCH/DELETE /api/phases/[id]      (NEW)
GET/POST   /api/transactions      (NEW — with filter query params)
PATCH/DELETE /api/transactions/[id] (NEW)
GET/POST   /api/categories        (NEW)
GET/POST   /api/budgets           (NEW)
GET/POST   /api/notes             (NEW — global notes endpoint)
PATCH/DELETE /api/notes/[id]       (NEW)
GET        /api/finance/summary   (NEW — aggregated monthly/yearly totals)
GET        /api/finance/export    (NEW — returns xlsx/csv file)
```

---

## Implementation Order

1. **Schema + Migration**: Update `prisma/schema.prisma` with Transaction, Category, Budget models + Task/Phase date fields. Run `npx prisma migrate dev --name v2-finance-timeline`.
2. **Seed script**: Create `prisma/seed.ts` that inserts default categories. Add `"prisma": { "seed": "npx tsx prisma/seed.ts" }` to package.json.
3. **Install new deps**: `npm install xlsx recharts react-markdown`
4. **Layout + Sidebar**: Rebuild `app/layout.tsx` with the sidebar. Create `app/components/Sidebar.tsx`.
5. **Shared UI components**: Create `app/components/ui/` folder with: Button, Card, Badge, Modal, Input, Select, Table, EmptyState, KPICard
6. **Dashboard page**: Rebuild `app/page.tsx` with KPI strip + activity feed + project grid
7. **Projects list + detail**: Rebuild project pages with Board/List/Timeline/Notes tabs
8. **Finance page**: Build `/finance/page.tsx` with chart, transaction table, category sidebar
9. **Export**: Build export API route + client-side download trigger
10. **Timeline page**: Build `/timeline/page.tsx` with Gantt chart
11. **Notes page**: Build `/notes/page.tsx`
12. **Polish**: Loading states, error boundaries, empty states, responsive tweaks

---

## Technical Notes

- **No authentication needed** — this is a private tool for 2 people. Netlify password protection will handle access control.
- **Assignees are hardcoded**: just "Brett" and "Jude" as string options (no user table needed)
- **SQLite is fine** for our scale — we have maybe 20 projects and a few hundred transactions
- **Server Components by default**, Client Components only where needed (forms, modals, interactive features like kanban drag-and-drop)
- **No external UI library** (no shadcn, no Radix) — build everything with Tailwind utility classes to keep it lean
- Use `"use client"` directive only on components that need browser APIs or React hooks
- All API routes should return proper error responses with status codes
- Use `cuid()` for all IDs (already configured in Prisma schema)
- Port 3001 for dev server (`npm run dev -- -p 3001`)

---

## Deployment (do this last)

- Deploy to **Netlify** with password protection
- Add `netlify.toml` at project root:
```toml
[build]
  command = "npx prisma generate && npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```
- SQLite file will live on the Netlify server (ephemeral — fine for now, can migrate to Turso/LibSQL later for persistence)
- Enable Netlify site-wide password protection in the Netlify dashboard (Site settings > Access & security > Visitor access > Password protection)

---

Start by reading the existing codebase to understand what's there, then work through the implementation order above. Build each section completely before moving to the next. Make sure the dev server compiles cleanly after each major section.
