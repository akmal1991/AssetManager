# Academic Publishing Portal

## Overview

A full-stack academic publishing portal for a university. Digitizes the workflow of accepting, reviewing, and publishing academic literature.

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
- **Charts**: Recharts
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
- **admin** — manage users, departments, scientific directions (add/delete), view stats and charts

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── portal/             # React + Vite frontend (at /)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
│       └── src/schema/
│           ├── users.ts    # users, departments tables
│           ├── submissions.ts # submissions, documents, reviews tables
│           └── directions.ts # scientific_directions table
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## API Routes

- `GET /api/healthz` — health check
- `POST /api/auth/register` — register user
- `POST /api/auth/login` — login
- `POST /api/auth/logout` — logout
- `GET /api/auth/me` — current user
- `GET /api/departments` — list all 33 departments
- `GET /api/submissions` — list submissions (role-filtered)
- `POST /api/submissions` — create new submission
- `GET /api/submissions/:id` — submission detail
- `PATCH /api/submissions/:id/status` — update status (editor/admin)
- `POST /api/submissions/:id/assign` — assign reviewer (editor/admin)
- `POST /api/submissions/:id/upload` — upload document file
- `GET /api/reviews` — list reviews (reviewer sees own)
- `GET /api/reviews/:id` — review detail
- `PATCH /api/reviews/:id` — submit review (reviewer)
- `GET /api/users` — list users (admin/editor)
- `PATCH /api/users/:id/role` — change user role (admin)
- `GET /api/admin/stats` — admin statistics

## Database Tables

- `departments` — 33 university departments (pre-seeded)
- `users` — users with roles (author/editor/reviewer/admin)
- `submissions` — manuscript submissions with status workflow
- `documents` — uploaded files per submission (6 doc types)
- `reviews` — expert review evaluations

## Submission Workflow

Submitted → Under Review → Revision Required (optional) → Accepted/Rejected → Published

## Departments (33 seeded)

Амалий информатика, Амалий косметология, Аниқ фанлар, Архитектура ва шаҳарсозлик, Ахборот технологиялари, Банк иши ва бухгалтерия ҳисоби, and 27 more.

## Env Vars

- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned)
- `PORT` — server port
- `JWT_SECRET` — optional, defaults to hardcoded dev secret
- `UPLOAD_DIR` — optional, defaults to /tmp/uploads
