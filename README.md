# Asset Manager / Academic Publishing Portal

Full-stack academic publishing portal for a university workflow. The system handles manuscript submission, editorial review, reviewer assignment, expert evaluation, admin reporting, and dictionary management for departments and scientific directions.

The UI is primarily in Uzbek (Latin script) and follows a professional academic dashboard style inspired by editorial workflow systems.

## Current Local Setup

- Recommended Node.js version: `20.20.1`
- Monorepo: `pnpm` workspaces
- Frontend: React 19 + Vite
- Backend: Express 5
- ORM: Drizzle ORM
- Local database: SQLite
- Database file: `local.db`
- Auth: JWT
- File uploads: Multer

The project originally targeted PostgreSQL, but this workspace is now configured to run locally with SQLite for development.

## Project Structure

```text
.
|-- artifacts/
|   |-- api-server/      # Express API
|   `-- portal/          # React + Vite frontend
|-- lib/
|   |-- api-client-react/
|   |-- api-spec/
|   |-- api-zod/
|   `-- db/              # Drizzle ORM schemas, DB connection, init/seed logic
|-- attached_assets/     # Specs and reference docs
|-- scripts/
|-- local.db             # Local SQLite database (generated locally)
|-- pnpm-workspace.yaml
`-- package.json
```

## Roles

- `author` - creates submissions and tracks manuscript status
- `editor` - manages review workflow and submission decisions
- `reviewer` - completes expert evaluations
- `admin` - manages users, dictionaries, templates, logs, and dashboard analytics

## Main Features

- User registration and login
- Role-based dashboards
- Four-step submission wizard
- Reviewer assignment
- Review form with scoring and verdicts
- Department and scientific direction management
- Email template management
- Audit logs
- Admin statistics and exports

## API Overview

Key API routes:

- `GET /api/healthz`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/departments`
- `POST /api/departments`
- `DELETE /api/departments/:id`
- `GET /api/scientific-directions`
- `POST /api/scientific-directions`
- `DELETE /api/scientific-directions/:id`
- `GET /api/submissions`
- `POST /api/submissions`
- `GET /api/submissions/:id`
- `PATCH /api/submissions/:id/status`
- `POST /api/submissions/:id/assign`
- `POST /api/submissions/:id/upload`
- `GET /api/reviews`
- `GET /api/reviews/:id`
- `PATCH /api/reviews/:id`
- `GET /api/users`
- `PATCH /api/users/:id/role`
- `GET /api/admin/stats`
- `GET /api/admin/audit-logs`
- `GET /api/admin/email-templates`
- `PATCH /api/admin/email-templates/:id`
- `GET /api/admin/export/users`
- `GET /api/admin/export/submissions`
- `GET /api/admin/export/reviews`
- `GET /api/admin/export/stats`

## Database and ORM

This project uses Drizzle ORM.

Main DB files:

- [lib/db/src/index.ts](C:/projects/Asset-Manager/lib/db/src/index.ts)
- [lib/db/src/init.ts](C:/projects/Asset-Manager/lib/db/src/init.ts)
- [lib/db/src/schema/users.ts](C:/projects/Asset-Manager/lib/db/src/schema/users.ts)
- [lib/db/src/schema/submissions.ts](C:/projects/Asset-Manager/lib/db/src/schema/submissions.ts)
- [lib/db/src/schema/directions.ts](C:/projects/Asset-Manager/lib/db/src/schema/directions.ts)
- [lib/db/src/schema/audit.ts](C:/projects/Asset-Manager/lib/db/src/schema/audit.ts)

Local behavior:

- `local.db` is created automatically
- schema is created automatically on API startup
- seed data is inserted automatically on first run

## Seeded Local Data

On first startup, the local SQLite database is seeded with:

- `1` admin user
- `32` departments
- `13` scientific directions
- `6` email templates

### Default Admin Account

- Email: `admin@uni.uz`
- Password: `Admin@Uni2026!`
- Role: `admin`

### Seeded Departments

- Amaliy informatika
- Amaliy kosmetologiya
- Aniq fanlar
- Arxitektura va shaharsozlik
- Axborot texnologiyalari
- Bank ishi va buxgalteriya hisobi
- Ijtimoiy gumanitar fanlar
- Ingliz tili
- Yo'l harakati
- Klinik fanlar
- Koreys tili filologiyasi
- Qurilish
- Libos dizayni
- Maktabgacha va boshlang'ich ta'lim metodikasi
- Maxsus pedagogika
- Mashinasozlik texnologiyasi
- Menejment va marketing
- Moliya
- Pedagogika va psixologiya
- Rus tili
- Tarjima nazariyasi va amaliyoti
- Tarix
- Terapevtik stomatologiya
- Tibbiy biologik fanlar
- Tibbiy fundamental fanlar
- Turizm
- Xirurgik fanlar
- Xalqaro iqtisodiyot
- Kimyo va biologiya
- Energetika va amaliy fanlar
- Pediatrik fanlar
- Rang tasvir

### Seeded Scientific Directions

- Arxitektura
- Iqtisodiyot
- Pedagogika
- Psixologiya
- San'at
- Tibbiyot
- Muhandislik
- Axborot texnologiyalari
- Filologiya
- Matematika
- Biologiya
- Kimyo
- Turizm

### Seeded Email Templates

- `submission_received`
- `review_assigned`
- `revision_required`
- `submission_accepted`
- `submission_rejected`
- `submission_published`

## Local Ports

- API: `http://127.0.0.1:8080`
- Frontend: `http://127.0.0.1:5173`

The frontend proxies `/api/*` requests to the local API server during development.

## How To Start

### 1. Install dependencies

Preferred:

```powershell
corepack pnpm install
```

Recommended Node version:

```powershell
node -v
```

Expected:

```text
v20.20.1
```

If you are on Windows and the repo preinstall shell script fails because `sh` is unavailable, use:

```powershell
corepack pnpm install --ignore-scripts
npm run install --prefix node_modules/.pnpm/better-sqlite3@11.10.0/node_modules/better-sqlite3
```

If your machine has a newer system Node and the local SQLite module fails to load, this workspace also supports a repo-local Node 20 binary at:

```text
.local/node20/node.exe
```

### 2. Start the API

From the repo root:

```powershell
.\artifacts\api-server\node_modules\.bin\tsx.cmd artifacts\api-server\src\index.ts
```

Or with `pnpm`:

```powershell
corepack pnpm --filter @workspace/api-server run dev
```

The API will:

- create `local.db` if it does not exist
- create tables
- seed the local data on first run

### 3. Start the frontend

In a second terminal:

```powershell
cd artifacts\portal
.\node_modules\.bin\vite.cmd --config vite.config.ts
```

Or with `pnpm`:

```powershell
corepack pnpm --filter @workspace/portal run dev
```

### 4. Open the app

Open:

- [http://127.0.0.1:5173](http://127.0.0.1:5173)

Health check:

- [http://127.0.0.1:8080/api/healthz](http://127.0.0.1:8080/api/healthz)

## Useful Commands

From the repo root:

```powershell
corepack pnpm run typecheck
corepack pnpm run build
corepack pnpm --filter @workspace/api-spec run codegen
corepack pnpm --filter @workspace/db run push
```

## Notes

- `local.db`, `uploads/`, and SQLite journal files are ignored by Git.
- Vite is configured with local defaults so `PORT` and `BASE_PATH` are not required for local development.
- The API defaults to port `8080` if `PORT` is not provided.
- The frontend defaults to port `5173` if `PORT` is not provided.

## Design Direction

- Primary visual theme: Academic Navy Blue
- Responsive dashboard UI
- Uzbek Latin content
- Professional editorial workflow feel
