# Wemuste

A private, map-first job platform for the UAE. Verified employers post jobs that appear as pins on a map;
signed-in job seekers tap a job and send a request. Wemuste owns and controls all employee data: nothing
is public, employers are created by the Wemuste team, and an employer only sees people who requested one
of their jobs (or whom an admin granted).

Stack: Next.js 16 (App Router, TypeScript strict) · Tailwind CSS 4 + shadcn/ui · Supabase (Postgres, Auth,
Storage, RLS) · Zod · React Hook Form · next-intl · Resend · Vercel.

## Local setup

Requirements: Node 22+, Docker (for the local Supabase stack).

```bash
npm install
npx supabase start          # local Postgres, Auth, Storage and a mail inbox; applies migrations
cp .env.example .env.local  # then fill in the values printed by `supabase status`
npm run dev                 # http://localhost:3100
```

**Emails are not delivered to real inboxes locally.** Signup codes, password resets and app emails all
land in the local Mailpit inbox at http://localhost:54324. Real delivery needs Resend configured on the
hosted project (see below).

Signup is verified with a **6-digit code** from the email (`supabase/templates/confirmation.html` uses
`{{ .Token }}`), entered on `/verify-email`; wrong codes are rate-limited per address and IP. Password
reset still uses an emailed link.

The local seed (`supabase/seed.sql`, local only) creates three logins, all with the password
`Wemuste-Local-2026!`, plus `[SAMPLE]` jobs around Dubai and sample onboarding content:

| Login                    | Role                                                   |
| ------------------------ | ------------------------------------------------------ |
| `admin@wemuste.local`    | Admin (enroll an authenticator app on first login)     |
| `employer@wemuste.local` | Approved employer "Sample Cafe Group"                  |
| `worker@wemuste.local`   | Job seeker with a finished profile (can send requests) |

### Tests

```bash
npm test                 # unit tests (Vitest)
npx supabase test db     # RLS / privilege tests (pgTAP, supabase/tests/database)
npm run test:e2e         # browser tests for all three roles (Playwright, port 3100)
```

### Environment variables

| Variable                         | Where           | Purpose                                                                |
| -------------------------------- | --------------- | ---------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`       | public          | Supabase project URL                                                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | public          | Publishable key. Safe only because RLS protects every table            |
| `NEXT_PUBLIC_SITE_URL`           | public          | Absolute origin of this app, used in auth email links                  |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | public          | Cloudflare Turnstile site key (leave empty locally)                    |
| `SUPABASE_SERVICE_ROLE_KEY`      | **server only** | Bypasses RLS. Used only in `src/lib/supabase/admin.ts` (`server-only`) |
| `IP_HASH_SECRET`                 | **server only** | ≥ 32 random chars. HMAC key for IPs and rate-limit keys                |
| `RESEND_API_KEY`                 | **server only** | Transactional email (Phase 6)                                          |

Variables are validated at startup (`src/lib/env.ts`, `src/lib/env.server.ts`). In Vercel, set them per
environment and never give Preview deployments the Production keys.

## Database

Schema, RLS policies, functions and storage buckets are SQL migrations in `supabase/migrations/`. Never edit
the schema in the dashboard.

```bash
npx supabase migration new <name>   # create a migration
npx supabase db reset               # rebuild the local database from migrations + seed
npx supabase db push                # apply migrations to the linked hosted project
npm run db:types                    # regenerate src/types/database.ts from the linked project
```

### Creating the first admin

Admins are never created through signup. Create the user in the Supabase dashboard (Auth > Users > Add
user, auto-confirm), then edit the email in `supabase/scripts/create-admin.sql` and run it in the SQL
editor (it has no JWT, which is the only context where roles can change).

On first login the admin is sent to `/admin/mfa` to enroll an authenticator app; admin pages and admin RLS
policies require MFA (`aal2`).

### Admin panel

`/admin` (MFA required): review job seekers (survey answers, test score, videos, CV) and approve
profiles and videos; create and suspend employers; remove jobs from the map; grant employers access to
chosen job seekers with scopes and expiry; edit the survey, the test (with answer keys) and the video
questions; read the append-only audit log. Status changes, grants, video reviews and activations run
through audited database functions.

### Creating employers

Employers cannot sign up. An admin creates them at **Admin > Employers > Create employer**. The app
generates a temporary password, shown once, to hand over securely; the employer must choose their own
password at first login. Under the hood the service role creates the user with
`app_metadata.wemuste_role = 'employer'`, which users can never set themselves.

### Hosted Supabase project settings (dashboard, not in migrations)

- **Auth > URL configuration:** Site URL = production origin. Redirect URLs (exact, no wildcards):
  `https://<domain>/auth/confirm?type=email` and `https://<domain>/auth/confirm?type=recovery`.
  Locally the app runs on port 3100 (`site_url` in `supabase/config.toml`).
- **Auth > Email templates:** paste `supabase/templates/*.html`. "Confirm signup" shows the 6-digit
  code (`{{ .Token }}`); reset and email change use token_hash links that work across devices. Keep
  Auth > Providers > Email > "Email OTP length" at 6.
- **Auth > Providers > Email:** confirm email ON, minimum password length 10, leaked password protection ON.
- **Auth > Attack protection:** CAPTCHA ON with Cloudflare Turnstile.
- **Auth > Rate limits:** review the defaults. The app adds its own limits on signup, login and reset.
- **Auth > MFA:** TOTP enabled.
- **Auth > SMTP:** Resend as custom SMTP (host `smtp.resend.com`, port 465, user `resend`, password =
  a Resend API key), sender on your verified domain, so verification/reset emails come from Wemuste.
- **Storage:** the project-wide upload limit must be ≥ 100 MB for video resumes (the Free plan caps it at 50 MB).

## Security model (summary)

- Three roles, stored in `public.profiles.role`, never in `user_metadata`. Signup can only create employees
  or employers (employers start `pending`). Column privileges and a trigger block role/status changes from the API.
- Default deny: `anon` has no table privileges; every table has RLS enabled and forced.
- Employers see employee data only through `private.has_active_grant()`, which allows either
  - an admin grant (`access_grants`: approved employer + approved employee + unrevoked + unexpired + scope), or
  - the employee's own job request: while pending, the employer sees `profile`, `test` and `video`;
    after they accept, also `contact` and `cv`. Withdrawn/declined requests or a suspended employer end it.
- Jobs: employees never read the `jobs` table. They use `list_open_jobs()` / `get_job()`, which return a
  pin offset 250-600 m from the real spot (derived from a secret, so it can't be averaged or reversed).
  The exact address is returned only after the employer accepts that employee's request.
- Status changes, grants, grading and meeting responses run in `SECURITY DEFINER` functions that check the
  caller and write `audit_logs` (append-only) in the same transaction.
- Test answer keys have no RLS policies at all; only the grading function reads them.
- Storage buckets are private; employers get 5-minute signed URLs through a server action that logs the view.
- Server actions validate with Zod (`strictObject`), derive identity from `supabase.auth.getUser()`, use the
  user-scoped client so RLS applies, and return generic errors.
- Nonce-based CSP, HSTS, `nosniff`, strict referrer policy and a camera/microphone-only permissions policy.
- CI fails if a secret value appears in `.next/static` (`npm run check:bundle`) or gitleaks finds a secret.

## Emails

Transactional emails (`src/emails`, sent from `src/lib/email`) go out after the response, never block an
action, and contain no personal data, only "log in to see it":

| Email                            | To         | When                                                         |
| -------------------------------- | ---------- | ------------------------------------------------------------ |
| Employer account ready           | employer   | an admin creates the account (the password is never emailed) |
| New candidates shared            | employer   | an admin grants access                                       |
| New meeting request              | job seeker | an employer proposes times                                   |
| Reply to your meeting request    | employer   | the job seeker picks a time or declines                      |
| Good news about your job request | job seeker | an employer accepts their request                            |

## Account deletion

Job seekers (Profile) and employers (Account) can delete their account after typing `DELETE`. This
revokes grants, deletes their files and the auth user (which cascades through every table), and leaves a
single pseudonymous `account.deleted` audit entry (id + role). Admin accounts can't self-delete.

## Performance and accessibility

Lighthouse (mobile, simulated slow 4G) on the public pages: performance 90-95, accessibility 100, best
practices 100, SEO 100. Public pages don't load the map library: their backgrounds are small static WebP
renders (a 38 KB portrait crop on phones). Zod runs in jitless mode so the strict CSP (no `unsafe-eval`)
is never violated.

## Final security checklist

- [x] RLS enabled and forced on every table; `npx supabase test db` passes (109 tests)
- [x] No public storage buckets; signed URLs expire in 5 minutes
- [x] Service-role key only in `server-only` files; `npm run check:bundle` finds nothing
- [x] Roles in `profiles`; no path for users to change role or status (tested)
- [x] Admin requires MFA (`aal2`) in pages and in RLS
- [x] Every server action validates with Zod (`strictObject`) and checks the role
- [x] Test answer keys unreadable by any client (no RLS policies at all)
- [x] App-level rate limits on auth, requests, uploads, meetings, media links; enable CAPTCHA and
      Supabase rate limits in the hosted project
- [x] Security headers and nonce CSP on every response
- [x] Employer access only through active, unexpired, scoped grants or the candidate's own request,
      from an approved employer to an approved/submitted candidate
- [x] Every employer view of candidate data and media logged in `audit_logs`
- [x] No personal data in logs, URLs or emails
- [x] Consent recorded at signup (and required before a profile can be submitted)

## Maps

MapLibre GL with free OpenFreeMap vector tiles (no API key), tinted pastel in `src/components/map/tint.ts`.
The worker files are copied to `public/vendor/maplibre` on install (`scripts/copy-maplibre-worker.mjs`).
Landing/auth backgrounds are static renders of the same map (`public/brand/map-*.jpg`). Map data ©
OpenStreetMap contributors; the attribution stays visible on every map.

## Data residency

The Supabase region is fixed when the project is created. The nearest regions to the UAE are Mumbai
(`ap-south-1`) and Frankfurt (`eu-central-1`). **The client must confirm the chosen region is acceptable
under the UAE PDPL before launch.**

## Scripts

| Script                                  | Does                                                  |
| --------------------------------------- | ----------------------------------------------------- |
| `npm run dev` / `build` / `start`       | Next.js                                               |
| `npm run lint` / `typecheck` / `format` | Code quality                                          |
| `npm test`                              | Vitest unit tests                                     |
| `npm run check:bundle`                  | Scan the client build for secrets (run after `build`) |
| `npm run db:types`                      | Regenerate Supabase types                             |
