# Supabase Auth Migration + RLS Security Hardening

## Goal
Migrate admin login from hardcoded credentials to Supabase Auth, harden RLS policies (authenticated-only writes), and get the build green.

## Progress

- [x] **Investigate** the in-progress changes (Supabase auth migration in App.tsx, AdminPanel credentials, schema/setup SQL, new rls-fix.sql)
- [x] **Confirm build break** — `npx tsc --noEmit` reported:
  - `src/App.tsx(120,7): error TS6133: 'ADMIN_EMAIL' is declared but its value is never read.`
  - `src/App.tsx(121,7): error TS6133: 'ADMIN_PASS' is declared but its value is never read.`
- [x] **Fix** — remove the unused `ADMIN_EMAIL` / `ADMIN_PASS` constants in `src/App.tsx` (login now uses `supabase.auth.signInWithPassword`)
- [x] **Verify** — `npx tsc --noEmit -p tsconfig.app.json` passes with no errors (tsc-output.txt empty)
- [x] **Update TODO.md** — log completed Supabase auth migration / RLS security work
- [x] **Commit & push** — `6219182 feat: migrate admin auth to Supabase + harden RLS policies` pushed to `main` (6 files, +532/−110)

