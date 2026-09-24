# Wemuste

A private platform that connects employees (job seekers) with employers. Wemuste owns and controls all
employee data: nothing is public, and employers see only what an admin has explicitly granted.

Stack: Next.js 16 (App Router, TypeScript strict) · Tailwind CSS 4 + shadcn/ui · Supabase (Postgres, Auth,
Storage, RLS) · Zod · React Hook Form · next-intl · Resend · Vercel.

## Local setup

Requirements: Node 22+, Docker (for the local Supabase stack).

```bash
npm install
npx supabase start          # local Postgres, Auth, Storage and a mail inbox; applies migrations
cp .env.example .env.local  # then fill in the values printed by `supabase status`
npm run dev                 # http://localhost:3000
```

Emails sent locally (verification, password reset) land in the Mailpit inbox at http://localhost:54324.

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
user), then run in the SQL editor (it has no JWT, which is the only context where roles can change):

```sql
update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'admin@example.com');
delete from public.employee_profiles where user_id = (select id from auth.users where email = 'admin@example.com');
```

On first login the admin is sent to `/admin/mfa` to enroll an authenticator app; admin pages and admin RLS
policies require MFA (`aal2`). Phase 2 turns this into `supabase/scripts/create-admin.sql`.

### Hosted Supabase project settings (dashboard, not in migrations)

- **Auth > URL configuration:** Site URL = production origin. Redirect URLs (exact, no wildcards):
  `https://<domain>/auth/confirm?type=email` and `https://<domain>/auth/confirm?type=recovery`.
- **Auth > Email templates:** paste `supabase/templates/*.html` (token_hash links that work across devices).
- **Auth > Providers > Email:** confirm email ON, minimum password length 10, leaked password protection ON.
- **Auth > Attack protection:** CAPTCHA ON with Cloudflare Turnstile.
- **Auth > Rate limits:** review the defaults. The app adds its own limits on signup, login and reset.
- **Auth > MFA:** TOTP enabled.
- **Auth > SMTP:** Resend as custom SMTP (Phase 6).
- **Storage:** the project-wide upload limit must be ≥ 100 MB for video resumes (the Free plan caps it at 50 MB).

## Security model (summary)

- Three roles, stored in `public.profiles.role`, never in `user_metadata`. Signup can only create employees
  or employers (employers start `pending`). Column privileges and a trigger block role/status changes from the API.
- Default deny: `anon` has no table privileges; every table has RLS enabled and forced.
- Employers see employee data only through `access_grants`, checked by `private.has_active_grant()`:
  approved employer + approved employee + unrevoked + unexpired + the requested scope
  (`profile`, `survey`, `test`, `video`, `cv`, `contact`).
- Status changes, grants, grading and meeting responses run in `SECURITY DEFINER` functions that check the
  caller and write `audit_logs` (append-only) in the same transaction.
- Test answer keys have no RLS policies at all; only the grading function reads them.
- Storage buckets are private; employers get 5-minute signed URLs through a server action that logs the view.
- Server actions validate with Zod (`strictObject`), derive identity from `supabase.auth.getUser()`, use the
  user-scoped client so RLS applies, and return generic errors.
- Nonce-based CSP, HSTS, `nosniff`, strict referrer policy and a camera/microphone-only permissions policy.
- CI fails if a secret value appears in `.next/static` (`npm run check:bundle`) or gitleaks finds a secret.

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
