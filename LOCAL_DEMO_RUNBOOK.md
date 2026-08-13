# Local MVP Runbook

This runbook documents the real Activation-first local MVP flow.

The implemented flow is:

Seeded Demo User
   -> Development Activation Bootstrap
   -> Activation URL
   -> /activate/:token
   -> Phone Verification
   -> OTP skipped in MVP mode
   -> Continue with Google
   -> Google OAuth
   -> Google sub linked to existing User
   -> User activated
   -> Session created
   -> Dashboard
   -> Logout
   -> /login
   -> Google OAuth
   -> Google sub -> User.googleSubject
   -> Session
   -> Dashboard

## 1. Prerequisites

- PostgreSQL must be running.
- Backend dependencies must be installed.
- Frontend dependencies must be installed.
- Google OAuth local credentials must be configured.
- Use localhost consistently for browser OAuth flow.

Required local URLs:

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Google callback: http://localhost:3000/auth/google/callback

## 2. Environment Setup

### Backend (backend/.env)

Use backend/.env.example as template and set:

- DATABASE_URL
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
- FRONTEND_URL=http://localhost:5173
- PORT=3000
- NODE_ENV=development
- AUTH_ACTIVATION_REQUIRE_OTP=false

### Frontend (frontend/.env)

Set:

- VITE_API_URL=http://localhost:3000

## 3. Start PostgreSQL

From repository root:

```bash
docker compose up -d postgres
```

## 4. Install Dependencies and Initialize DB

From repository root:

```bash
pnpm install
pnpm --filter backend exec prisma generate
pnpm --filter backend exec prisma migrate dev
pnpm --filter backend exec prisma db seed
```

The seed command above uses the existing backend Prisma seed mechanism.

## 5. Start the Application

Use the existing root command that starts backend and frontend together:

```bash
pnpm start:dev
```

Verify services:

- Frontend is reachable at http://localhost:5173/login
- Backend is reachable at http://localhost:3000/auth/me (expected 401 before login)

## 6. Seeded Demo User Initial State

After seed and before activation, the Demo User should be unlinked/unactivated:

- googleSubject = NULL
- activatedAt = NULL
- googleLinkedAt = NULL
- phoneVerifiedAt = NULL

Demo phone for activation flow:

- 0547724987

## 7. Create Demo Activation

From repository root:

```bash
pnpm --filter backend activation:demo
```

This command:

- Finds the seeded Demo Commander (email + phone match)
- Creates a real Activation via ActivationsService lifecycle
- Prints an activation URL such as http://localhost:5173/activate/<token>
- Persists only tokenHash in DB (not raw token)
- Does not activate the user
- Does not link Google
- Does not create a session

Open the printed activation URL in the browser.

## 8. First Registration (Activation Route)

Open:

- http://localhost:5173/activate/<token>

Expected page title/state:

- הפעלת החשבון

Flow:

1. Enter the phone number tied to the activated user (Demo: 0547724987).
2. Submit phone verification.
3. Phone must match the user associated with this activation token.

## 9. MVP OTP Behavior

In local MVP mode, OTP is intentionally skipped.

- Phone verification is still mandatory.
- Do not use or expect any fake OTP.
- There is no OTP entry screen in this MVP flow.

## 10. Google Linking

After successful phone verification, the page should show:

- הטלפון אומת בהצלחה.

Then click the Google continuation action and complete OAuth.

Result:

- Google sub is linked to the existing User record.
- No new User is created.

## 11. Activation Completion Expected State

After successful OAuth callback:

- User.googleSubject != NULL
- User.googleLinkedAt != NULL
- User.activatedAt != NULL
- Activation.usedAt != NULL

A session is created and the user is redirected to Dashboard.

## 12. Logout

Use the existing frontend logout action (top bar "התנתקות"/"יציאה").

Existing behavior:

- Frontend calls backend logout endpoint.
- Session cookie is cleared.
- App returns to /login.

## 13. Normal Login (After Activation)

After activation is completed:

1. Go to /login.
2. Click the Google login button.

Normal login path is:

Google sub
   -> User.googleSubject
   -> Session
   -> Dashboard

Explicitly not part of normal login:

- No phone verification
- No activation token
- No OTP
- No user creation
- No email fallback

## 14. Verification Checklist

Before activation:

- [ ] googleSubject = NULL
- [ ] activatedAt = NULL
- [ ] googleLinkedAt = NULL
- [ ] phoneVerifiedAt = NULL

After first registration completes:

- [ ] googleSubject != NULL
- [ ] activatedAt != NULL
- [ ] googleLinkedAt != NULL
- [ ] Activation.usedAt != NULL
- [ ] Session exists
- [ ] Dashboard is accessible

After logout:

- [ ] Session no longer authenticates user
- [ ] Login page is shown

After normal Google login:

- [ ] Same Google subject resolves to existing User
- [ ] New session is created
- [ ] Dashboard is accessible

## 15. Troubleshooting

Postgres unavailable:

- Ensure postgres container is up: docker compose ps
- Start it: docker compose up -d postgres
- Confirm DATABASE_URL points to localhost:5432

Backend port 3000 already in use:

- Inspect process: lsof -i :3000
- Stop conflicting process or run backend after freeing the port

Frontend port 5173 already in use:

- Inspect process: lsof -i :5173
- Stop conflicting process or restart frontend after freeing the port

Google OAuth not configured:

- Ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in backend/.env
- Ensure GOOGLE_REDIRECT_URI is exactly http://localhost:3000/auth/google/callback

Redirect URI mismatch:

- In Google Cloud Console, verify authorized redirect URI exactly matches:
   - http://localhost:3000/auth/google/callback
- Ensure browser flow also uses localhost (not mixed hosts)

Activation token invalid/expired/revoked:

- Create a fresh activation URL with pnpm --filter backend activation:demo
- Reopen the latest printed /activate/<token> URL

Phone verification failure:

- Confirm the phone entered matches the phone of the user tied to that activation
- For demo commander, use 0547724987

Google linking failure:

- Retry from the same activation page after confirming backend/frontend are running
- Confirm OAuth credentials and redirect URI are correct

User already activated:

- This activation is already completed or no longer usable
- Use normal /login flow for that activated user

## 16. Important Notes on Auth Architecture

- Normal authentication is Google Subject only.
- No email fallback exists.
- No automatic user creation exists.
- SystemUser is not part of business authentication.
- Activation is first, normal Google login is second.
