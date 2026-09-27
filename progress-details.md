## 2026-09-27 — Breeding pagination correction

- Root cause: API loaded every `breeding_records` and pending `calf_care_plans` row, derived lists in JavaScript, then paginated with `slice`.
- Fix: moved all five lists to PostgreSQL queries using `LIMIT 7 OFFSET`, separate `COUNT(*)` metadata, and CTE/window/lateral derivation. Replaced form support transfers with compact aggregate queries while retaining full cattle data for forms.
- Validation: `npm run typecheck` and focused ESLint on `src/app/api/breeding/route.ts` and `src/app/breeding/page.tsx` pass.
