# Local Demo Runbook

This runbook documents how to run the current application locally for a real end-to-end demo without changing the authentication/authorization architecture.

## 1. Prerequisites

- Node.js: 20.19+ (Vite engine requirement from lockfile)
- pnpm: 11.20.0 (from root package.json)
- Docker + Docker Compose

## 2. Environment Variables

### Backend (`backend/.env`)

Use `backend/.env.example` as the template.

Required keys:

- `DATABASE_URL=`
- `GOOGLE_CLIENT_ID=`
- `GOOGLE_CLIENT_SECRET=`
- `GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback`
- `FRONTEND_URL=http://localhost:5173`
- `PORT=3000`
- `NODE_ENV=development`

### Frontend (`frontend/.env`)

Create `frontend/.env` with:

- `VITE_API_URL=http://localhost:3000`

## 3. Google OAuth Setup

In Google Cloud Console, configure an OAuth 2.0 Web application with:

- Authorized redirect URI:
  - `http://localhost:3000/auth/google/callback`

The Google account used for local demo login is:

- `neriakalazan@gmail.com`

## 4. Database Startup

From repository root:

```bash
docker compose up -d postgres
```

Postgres configuration from `docker-compose.yml`:

- host: `localhost`
- port: `5432`
- database: `reserve_management`
- user: `postgres`
- password: `postgres`

## 5. Install and Initialize

From repository root:

```bash
pnpm install
pnpm --filter backend exec prisma generate
pnpm --filter backend exec prisma migrate dev
pnpm --filter backend exec prisma db seed
```

## 6. Start Services

From repository root, in separate terminals:

```bash
pnpm --filter backend start:dev
pnpm --filter frontend dev
```

## 7. Demo Account and Permissions

Seed includes an application `User` with:

- email: `neriakalazan@gmail.com`
- active: `true`
- company: `פלוגת Demo`
- role: `מ"פ` (Company Commander)

Seed also ensures and assigns:

- permission key: `MANAGE_COMPANIES`

This permission is required by current protected company-facing APIs, including dashboard.

## 8. Smoke Test

1. Open frontend login page:
   - `http://localhost:5173/login`
2. Click "התחברות עם Google".
3. Complete Google login with `neriakalazan@gmail.com`.
4. Confirm redirect back to frontend.
5. Confirm authenticated app loads and dashboard data appears.
6. Verify API auth state:
   - `GET /auth/me` returns authenticated user and `user.companyId`.

## 9. Notes on Authorization Model

- OAuth login maps Google email to the application `User` table.
- `SystemUser` is separate and not used by current login flow.
- For local demo, commander operations are enabled via `UserPermission` (`MANAGE_COMPANIES`).
