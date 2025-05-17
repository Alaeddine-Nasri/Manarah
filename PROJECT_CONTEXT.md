# PROJECT_CONTEXT.md
> This file is a living handoff document. Each Claude instance should read it at the start of the session and append a progress entry at the bottom when the session ends.

---

## Project Overview

**Manarah** is a full-stack school management SaaS built for Algerian private tutoring centers. It handles students, teachers, sessions, QR attendance, payments, payroll, and expenses — all in a clean, human-written codebase intended as a portfolio project.

**Owner:** Alaeddine Nasri (alaeddine on GitHub → `Alaeddine-Nasri/Manarah`)
**Deployed on:** Render (free tier, SQLite, ephemeral filesystem unless persistent disk is added)
**Demo URL:** (check Render dashboard)
**Demo credentials:** `admin@manarah.com` / `admin123`

---

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React (Vite), CSS variables, i18n (fr/en/ar) |
| Backend    | Node.js + Express                       |
| Database   | SQLite via `better-sqlite3`             |
| Auth       | JWT (stored in localStorage)            |
| Deploy     | Render (web service + optional persistent disk at `/data`) |
| QR Codes   | `qrcode` npm package                    |
| Print      | Browser `window.print()` with CSS       |

---

## Architecture

```
Manarah/
├── client/                        # React frontend (Vite)
│   ├── src/
│   │   ├── api/                   # One file per resource (axios wrappers)
│   │   │   ├── auth.js, students.js, teachers.js, sessions.js
│   │   │   ├── payments.js, payroll.js, expenses.js, attendance.js
│   │   │   ├── levels.js, modules.js, users.js, schools.js (new)
│   │   │   ├── teacherPortal.js, demo.js, export.js, notifications.js
│   │   ├── components/
│   │   │   ├── Sidebar.jsx, Topbar.jsx, Layout.jsx
│   │   │   ├── QRScanner.jsx (new), ScanPopup.jsx (new)
│   │   │   ├── StatsCard.jsx, Badge.jsx, ConfirmModal.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx, Students.jsx, Teachers.jsx
│   │   │   ├── Sessions.jsx      ← most complex page (calendar + flip card)
│   │   │   ├── Payments.jsx, Payroll.jsx, Expenses.jsx
│   │   │   ├── Structure.jsx     ← levels/years/groups tree
│   │   │   ├── Settings.jsx      ← users + school info card (new)
│   │   │   ├── TeacherPortal.jsx ← teacher-only login view
│   │   ├── locales/
│   │   │   ├── fr.json           ← primary language (humanized)
│   │   │   ├── en.json, ar.json
│   │   ├── context/              # AuthContext, ThemeContext, ToastContext
│   │   ├── utils/printQR.js      ← student ID card printer (85×54mm, 6/page)
│   │   └── index.css             ← all global styles + CSS variables
│
├── server/
│   ├── index.js                  ← entry point + auto-init admin IIFE
│   ├── db/
│   │   ├── db.js                 ← SQLite init + migrations (ALTER TABLE)
│   │   ├── schema.sql            ← base schema
│   │   └── demoSeed.js           ← full demo data seeder
│   ├── routes/                   # One file per resource
│   │   ├── auth.js, students.js, teachers.js, sessions.js
│   │   ├── payments.js, payroll.js, expenses.js, attendance.js
│   │   ├── levels.js, modules.js, users.js, schools.js (new)
│   │   ├── teacherPortal.js, demo.js, export.js
│   │   ├── dashboard.js, notifications.js, auditLogs.js
│   ├── controllers/              # Business logic, mirrors routes/
│   ├── models/                   # SQLite query helpers per entity
│   ├── middleware/               # auth.js (JWT), error.js
│   └── utils/                   # audit.js, notify.js
│
├── CLAUDE_RULES.md               ← coding style rules (read before writing code)
├── MANARAH_SPEC.md               ← original feature spec
├── PROJECT_CONTEXT.md            ← this file
├── README.md                     ← portfolio-ready readme
└── render.yaml                   ← Render deployment config
```

---

## Database Schema (Key Tables)

- **schools** — `id, name, code, location` (location added via migration)
- **school_users** — `school_id, user_id, role (admin|staff|teacher), teacher_id`
- **levels** — `school_id, name, type (primary|middle|secondary|workshop)`
- **years** — `level_id, name`
- **groups** — `year_id, name, module_id, teacher_id` (module/teacher added via migration, NO direct school_id — join through years→levels)
- **students** — full profile + `qr_code` (unique UUID), `status (active|suspended|archived)`
- **sessions** — `teacher_id, module_id, group_id, date, start_time, end_time, attendance_open`
- **attendance** — `session_id, student_id, status (present|absent), scanned_at`
- **payments** — `student_id, teacher_id, module_id, amount, type (monthly|pack|per_session|...)`
- **payroll_records** — `teacher_id, month` (marks teacher paid for that month)
- **expenses** — `category, description, amount, date`

> **Important:** groups has NO `school_id`. To filter groups by school always JOIN: `groups → years → levels → levels.school_id`

---

## Roles & Auth

- **admin** — full access, sees Settings with school info + user management
- **staff** — limited access, no settings
- **teacher** — only sees TeacherPortal (their sessions + attendance)
- JWT stored in localStorage, decoded in `AuthContext`
- `school_users.teacher_id` links a teacher-role user to their teachers record

---

## Key Decisions & Constraints

1. **SQLite on Render is ephemeral** — DB resets on redeploy unless a Persistent Disk is mounted at `/data` with env `DB_PATH=/data/manarah.db`. Current fallback: `path.join(__dirname, '../../manarah.db')` (writable local path).
2. **Auto-init admin** — `server/index.js` has an IIFE that creates the admin user on first start if the email doesn't exist (reads from env: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `SCHOOL_NAME`, `SCHOOL_CODE`).
3. **Demo seed** — `POST /api/demo/seed` triggers `demoSeed.js`. It wipes all school data and reseeds 13 weeks of realistic data (Jan–Apr 2026, Batna Algeria). Only resets `role='teacher'` passwords (not admin/staff).
4. **Code style** — Read `CLAUDE_RULES.md`. Write like a human dev: no over-abstraction, minimal comments, simple hooks.
5. **Language** — UI is French-first (`fr.json`). All user-facing strings go through `t('key')` via the i18n hook.
6. **Print** — Student ID cards use `window.open()` + `document.write()` + `window.print()`. Format: 85×54mm landscape, 2×3 grid on A4, red accent design.

---

## Pages & Features Status

| Page | Status | Notes |
|------|--------|-------|
| Login | ✅ Done | JWT, error messages humanized |
| Dashboard | ✅ Done | Stats, charts, recent activity |
| Students | ✅ Done | CRUD, QR, print ID cards, filters |
| Teachers | ✅ Done | CRUD, assignments, rate overrides |
| Structure | ✅ Done | Levels → Years → Groups tree |
| Modules | ✅ Done | CRUD, assign to level/year |
| Sessions | ✅ Done | 24h calendar grid, flip card (mini-cal ↔ QR scanner), teacher color filter |
| Attendance | ✅ Done | Per-session attendance, QR scan |
| Payments | ✅ Done | Per student, monthly view |
| Payroll | ✅ Done | Per teacher per month, mark paid |
| Expenses | ✅ Done | Category CRUD |
| Settings | ✅ Done | User management + school info card (edit name/location, counts) |
| TeacherPortal | ✅ Done | Teacher-only view: sessions + attendance open/close |
| Export | ✅ Done | CSV/PDF exports |
| Notifications | ✅ Done | Bell icon, per-user |
| Audit Log | ✅ Done | Admin-only action history |
| Demo seed | ✅ Done | One-click realistic data reset |

---

## Sessions Page (Most Complex)

- **Layout:** Two-row header (`cal-header-main` + `cal-header-legend`)
  - Row 1: title + day/week toggle + today button + nav arrows + teacher dropdown + add button
  - Row 2: teacher color pills (legend/filter)
- **Flip card** (height: 295px, `perspective: 900px`):
  - Front: MiniCalendar + "📷 Passer au scanner" button
  - Back: QRScanner fills height + "📅 Voir le calendrier" button + open sessions list below
- **Timeline:** 24h grid, `HOUR_H = 64px`, labels 00:00–23:00, scrolls to 7:00 on mount
- **QR Scanner:** `client/src/components/QRScanner.jsx` — simple wrapper, fills 100% of container

---

## API Routes Summary

```
POST   /api/auth/login
GET    /api/schools/info          ← school name, location, student/teacher/group counts
PATCH  /api/schools/info          ← update name, location
GET    /api/students
GET    /api/sessions
POST   /api/sessions
PATCH  /api/sessions/:id/attendance-open
POST   /api/attendance/scan       ← QR scan endpoint
GET    /api/dashboard
POST   /api/demo/seed             ← wipe + reseed demo data
GET    /api/teacher-portal/sessions
```

---

## Environment Variables (server/.env)

```
PORT=3001
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_long_secret
DB_PATH=/data/manarah.db          # only if persistent disk mounted on Render
ADMIN_EMAIL=admin@manarah.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=Admin
SCHOOL_NAME=École Manarah
SCHOOL_CODE=MANARAH
```

---

## Running Locally

```bash
# Backend
cd server && npm install && node index.js

# Frontend
cd client && npm install && npm run dev
```

---

## Git History (key commits)

| Hash | Message |
|------|---------|
| `5cf6b2b` | fix: use local fallback DB path when /data persistent disk not mounted |
| `c814e2a` | feat: scanner flip card, 24h timeline, ID cards, school info, demo data & Render deploy fix |
| `c0d3867` | feat: demo seed, teacher portal, module filter by teacher, logout fix |
| `87b160e` | fix: add client source files as regular directory |
| `8c8b735` | initial: full project |

---

## Progress Log
> Each Claude instance appends an entry here when the session ends.

---

### Session 1 → Session 3 (context summary, ~Apr 1–2 2026)
**What was built:**
- Full initial project (all pages, API, DB schema)
- Teacher portal + teacher role in school_users
- Demo seed with 13 weeks of data (Jan–Apr 2026), seeded RNG, attendance variance by month, monthly payments, expenses spread across 4 months
- Sessions page: flip card (mini-cal ↔ QR scanner), 24h timeline, two-row header with teacher legend
- QRScanner component (fills flip card back face)
- Student ID cards: 85×54mm business card format, 6/page, red accent
- Settings: school info card (name, location, student/teacher/group counts), editable
- server/routes/schools.js: GET+PATCH /api/schools/info (group_count uses JOIN fix)
- Auto-init admin IIFE in server/index.js (Render fresh DB fix)
- DB_PATH fallback changed from `/data/manarah.db` → local relative path (Render EACCES fix)
- fr.json humanized (warm, natural French messages)
- README rewritten for portfolio

**Known issues fixed:**
- Groups count query crashed silently (groups has no school_id → fixed with JOIN)
- demoSeed was resetting admin password (fixed: only reset role='teacher' users)
- Timeline was broken (wrong offsets) → full rewrite to 0-offset 24h grid
- Flip card collapsed (no height on container) → fixed with explicit 295px height

**Pending / not done yet:**
- Nothing explicitly requested and left unfinished as of end of session
- Render persistent disk not set up (user's choice — they're on free tier)

---
<!-- Next Claude: append your session summary below this line -->
