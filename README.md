# Presentalia — Talk Companion Platform

A web companion for live talks about AI agents. Attendees join talks by email
invitation; presenters create and manage their own talks; admins manage all
talks and user roles. Users sign in with email magic links, attendees vote
once, and everyone with talk access can see live results. Anonymous results
are the default; voter emails appear only when a presenter or admin explicitly
chooses identifiable results before launching a poll.

## Requirements

- Node.js 24 (or newer supported by the installed Next.js release) and npm.
- Docker Desktop/Engine running (the local Supabase stack runs in containers).
- `curl` and `git` for the nvm installer.
- A Vercel project for deployment.

## Hosted Supabase setup (deployment)

1. Create a Supabase project, enable the Email provider/magic links under
   **Authentication → Providers**, and disable public sign-ups. Accounts are
   provisioned by an admin, when added to a talk roster, or for the one-time
   bootstrap email; public Auth sign-up must not be a second way around that
   allowlist. With no custom SMTP, Supabase's hosted built-in sender only sends
   to authorized project-team addresses and is currently limited to two emails
   per hour; it is for testing, not invitations to external attendees.
2. Open **SQL Editor** and run
   [`supabase/migrations/0001_talk_platform.sql`](supabase/migrations/0001_talk_platform.sql)
   once. It creates the role and talk-owner fields, user-ID talk memberships,
   email-verification sync, last-admin safeguards, vote-count and user-sync
   triggers, and private slide bucket (PDF only, 20 MB max). App-table access is
   restricted to the server's database connection; do not grant direct
   Supabase API access to these tables. Keep the slide bucket private.
3. Under **Authentication → URL Configuration**, set the Site URL and add
   these redirect URLs (replace the production origin with the deployed app):
   - `http://localhost:3000/auth/confirm`
   - `https://YOUR-VERCEL-DOMAIN/auth/confirm`
4. Under **Authentication → Email Templates**, set the **Invite user** link to
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite`
   (this lets the server verify the invite token and establish the session)
   and replace the **Magic link** template with the copy from
   `supabase/templates/magic-link.html` so returning users get a branded
   sign-in email. Also set **Email OTP Expiration** to 24 hours: invites and
   sign-in links share this expiry, and the local config uses 24 hours so
   invitees can read their email before the link expires.
5. Under **Project Settings → API**, copy the project URL, anon/public key,
   and service-role key. Under **Project Settings → Database → Connection
   string**, copy the **Transaction pooler** URL for the app's `DATABASE_URL`.
   The database password is URL-encoded if it contains reserved characters.

Only provisioned app users and the one-time bootstrap email can request a
sign-in link; an attendee does not need talk membership to sign in. Adding an
attendee to a talk provisions an account if necessary, and admins can also add
attendees without assigning a talk. Provisioning sends an invite; unverified
users can request the invite again, while verified users receive a sign-in link.
Invites and sign-in links share the Email OTP Expiration setting (24 hours in
the local config); the invite email points recipients to the login page for a
fresh link if theirs has expired.
Unprovisioned addresses get the same generic confirmation message but no email
or account. New accounts remain unverified until the person completes the
invite, and `app_users` mirrors Auth's verification timestamp.
Syntactically valid requests have a two-second minimum response time to reduce
account probing. Regular OTP requests do not create accounts; unverified
provisioned users receive an Auth invite link. The first verified sign-in for
`ADMIN_EMAIL` bootstraps the first database-backed admin and assigns legacy
talks to that user; after that, `ADMIN_EMAIL` is no longer an authorization
source. `app_users` is synchronized from `auth.users`, stores each user's app
role, and mirrors their email-verification timestamp.

## Local development

```bash
./scripts/install-local-deps.sh
./scripts/run-local.sh
```

The installer adds nvm (if needed), Node.js 24, project npm dependencies, and
the Supabase CLI. Docker must be installed and running. `run-local.sh` starts
the local Supabase stack, applies the SQL, writes the local Supabase
credentials to `.env.local`, and starts Next.js. It preserves an existing
`ADMIN_EMAIL`; otherwise the local bootstrap email is `admin@example.com`. Set
`ADMIN_EMAIL` before running the script to choose the first admin. That account
becomes a database admin after its first verified magic-link sign-in.

Open [http://localhost:3000](http://localhost:3000). Magic-link emails are
captured by the local mail inbox at [http://127.0.0.1:54324](http://127.0.0.1:54324).
The first admin signs in with `ADMIN_EMAIL`, creates talks, adds attendees or
presenters from **Manage users**, and assigns attendees to talks through each
talk's roster. Attendees can exist and sign in before being assigned to a talk.
Presenters sign in with their email and manage talks they create. Supabase
Studio is at
[http://127.0.0.1:54323](http://127.0.0.1:54323).

The local stack keeps its database in Docker volumes between runs. Stop it
with `npx supabase stop`; to reset local data and reapply migrations, run
`npx supabase db reset` (this deletes local Supabase data). To pass Next.js
options, use `npm run local -- --port 3001`. The MVP schema is kept in the
original SQL file, so reset an existing local database after changing it.

For a hosted Supabase project, configure these environment variables in
`.env.local` for local app testing or in Vercel for deployment:

| Variable                        | Value                                                        | Exposure                                     |
| ------------------------------- | ------------------------------------------------------------ | -------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                                         | Browser and server                           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key                                     | Browser and server                           |
| `DATABASE_URL`                  | Supabase transaction-pooler URL, including `sslmode=require` | **Server only**                              |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service-role key                                    | **Server only; never expose to the browser** |
| `ADMIN_EMAIL`                   | One-time email for bootstrapping the first database admin    | **Server only**                              |
| `NEXT_PUBLIC_SITE_URL`          | Optional app origin                                          | Browser and server                           |

## Deploy to Vercel

1. Import the repository into Vercel and select the default Next.js settings.
2. Add the environment variables above to the Vercel project (Production and
   any Preview environments that should be usable). Set `NEXT_PUBLIC_SITE_URL`
   to the corresponding app origin if needed.
3. Add the matching `/auth/confirm` URL to Supabase's Auth redirect allow-list.
4. Set `ADMIN_EMAIL` to the existing first-admin address and deploy. Complete a
   verified magic-link sign-in with that account to bootstrap its database role
   and assign legacy talks. Slide PDFs upload
   directly from a talk owner/admin's browser to the private Supabase bucket
   using a server-issued, time-limited upload token; they do not pass through a
   Vercel function. The bucket enforces the 20 MB and PDF MIME limits. Downloads
   use a server-issued signed URL after talk-access authorization.

Keep `DATABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` server-only. Never prefix
them with `NEXT_PUBLIC_` or expose them in client components.

## Architecture map

- `src/app/` — Next.js App Router pages and route handlers.
- `src/actions/` — server actions for login links, account provisioning, user
  roles, talks, rosters, slides, polls, and voting. Privileged actions check the
  database-backed role and talk ownership before using the owner connection.
- `src/db/schema.ts` — Drizzle schema and inferred row types; talk roster
  membership references app-user IDs, with email verification mirrored from
  Auth.
- `src/db/index.ts` — server-only Drizzle connection using `DATABASE_URL`.
- `src/lib/membership.ts` — shared server-side talk authorization for admins,
  presenters, and rostered attendees.
- `src/lib/polls.ts` and `src/lib/poll-results.ts` — poll validation,
  lifecycle rules, result calculations, and privacy-safe result payloads.
- `src/components/LiveResults.tsx` — shared attendee/presenter/admin/projector
  results display, refreshed through the authorized results endpoint every five
  seconds.
- `supabase/migrations/` — Postgres schema, private storage bucket, and trigger
  setup.

To add a future activity module, reuse talk membership and the shared
`activities` lifecycle, add an explicit new `type` and a sibling typed table
for that module's input/result data, then add its own actions and routes. Polls
are intentionally implemented as a typed module; there is no generic activity
builder or configurable form engine.

## Checks and formatting

```bash
npm test            # Vitest unit and PGlite database tests
npm run build       # Next.js production build and TypeScript checks
npm run lint        # ESLint
npm run format      # Format application, tests, migrations, and root config
npm run format:check # Verify formatting without changing files
```

The PGlite suite applies the initial SQL file against a local Postgres-WASM
database with minimal Supabase `auth` and `storage` stand-ins. It checks
database constraints, role defaults and bootstrap, last-admin safeguards,
vote-count and user-sync triggers, and private bucket configuration. Pure tests
cover role/session loading, login allowlisting, roster parsing, poll rules,
result privacy/math, upload validation, and Postgres error mapping.

There is no hosted Supabase project in the automated test environment. Before
launch, verify magic-link delivery/redirects, the signed PDF upload and
authorized download, and Vercel environment configuration against the actual
project.
