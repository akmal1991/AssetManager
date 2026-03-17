# Academic Publishing Portal

## Overview

A full-stack academic publishing portal for a Uzbekistan university. Digitizes the workflow of accepting, reviewing, and publishing academic literature (textbooks, monographs, manuals). Interface is in Uzbek (Latin script). Professional quality modeled after Scopus/Editorial Manager.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: React + Vite (artifacts/portal)
- **State management**: Zustand
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts (Bar, Pie)
- **Animations**: Framer Motion
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: JWT (jsonwebtoken + bcrypt)
- **File uploads**: Multer

## User Roles

- **author** — submit manuscripts, track status
- **editor** — review submissions, assign reviewers, update status
- **reviewer** — fill expert evaluation forms
- **admin** — full system management: users, departments, directions, email templates, audit logs, charts

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (port 8080)
│   └── portal/             # React + Vite frontend (at /)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
│       └── src/schema/
│           ├── users.ts         # users, departments tables
│           ├── submissions.ts   # submissions, documents, reviews tables
│           ├── directions.ts    # scientific_directions table
│           └── audit.ts         # audit_logs, email_templates tables
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## API Routes

- `GET /api/healthz` — health check
- `POST /api/auth/register` — register user (role defaults to "author")
- `POST /api/auth/login` — login, returns JWT
- `GET /api/auth/me` — get current user
- `GET /api/departments` — list departments
- `POST /api/departments` — create department (admin)
- `DELETE /api/departments/:id` — delete department (admin)
- `GET /api/scientific-directions` — list scientific directions
- `POST /api/scientific-directions` — create direction (admin)
- `DELETE /api/scientific-directions/:id` — delete direction (admin)
- `GET /api/submissions` — list submissions (role-filtered)
- `POST /api/submissions` — create submission with file upload
- `GET /api/submissions/:id` — get submission detail
- `PATCH /api/submissions/:id/status` — change status (editor/admin)
- `POST /api/submissions/:id/assign-reviewer` — assign reviewer (editor)
- `GET /api/reviews/:id` — get review
- `PUT /api/reviews/:id` — submit review (reviewer)
- `GET /api/admin/users` — list all users (admin)
- `PATCH /api/admin/users/:id/role` — change user role (admin)
- `GET /api/admin/stats` — dashboard stats with submissionsByStatus (admin)
- `GET /api/admin/audit-logs` — audit log list with pagination (admin)
- `GET /api/admin/email-templates` — list email templates (admin)
- `PATCH /api/admin/email-templates/:id` — update email template (admin)

## Admin Panel Sections (URL-driven)

- `/dashboard/admin` → **Statistika** — KPI cards + Bar chart (submissions by status) + Pie chart (users by role)
- `/dashboard/admin/users` → **Foydalanuvchilar** — user table with role filter chips, inline role change dropdown
- `/dashboard/admin/dictionaries` → **Lug'at sozlamalari** — Kafedralar + Ilmiy yo'nalishlar add/delete panels
- `/dashboard/admin/email-templates` → **Email shablonlari** — 6 templates, inline editor with subject/body, toggle on/off
- `/dashboard/admin/logs` → **Audit loglari** — chronological action history with icons, user info, IP

## Auth

- JWT Bearer token in `localStorage` as `portal_token`
- Global fetch interceptor in `App.tsx` injects token on all API calls
- Auth helper: `artifacts/api-server/src/lib/auth.ts` → `requireAuth(req)`, `requireRole(req, role)`
- Audit helper: `artifacts/api-server/src/lib/audit.ts` → `logAction(req, action, opts)`

## Default Admin Credentials

- Email: `admin@uni.uz`
- Password: `Admin@Uni2026!`
- Role: `admin`

## Seeded Data

- **33 departments** (Latin script faculty names)
- **13 scientific directions** (Latin script)
- **6 email templates** (submission_received, review_assigned, revision_required, submission_accepted, submission_rejected, submission_published)

## Design

- Theme: Academic Navy Blue (`#1e3a8a` / `hsl(224, 64%, 33%)`)
- Professional Scopus/Editorial Manager quality
- Fully responsive
- All text in Uzbek (Latin script)

## Commands

- Push DB schema: `pnpm --filter @workspace/db run push`
- Run codegen: `pnpm --filter @workspace/api-spec run codegen`
- Dev API: `pnpm --filter @workspace/api-server run dev`
- Dev portal: `pnpm --filter @workspace/portal run dev`
