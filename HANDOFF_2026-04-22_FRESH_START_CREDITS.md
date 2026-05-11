# Fresh Start Credits Handoff (2026-04-22)

## Objective
Recover and verify credits for:
- Karim Anaya (`k.anaya.izquierdo@gamil.com`)
- Cadel Anaya (`cadel.ollin.anaya@gmail.com`)

Using source-of-truth export databases:
- `family_export.karim-only.json`
- `family_export.cadel-only.json`

## What Was Verified Locally

### Correct source files (contain credits)
- `family_export.karim-only.json`
  - users: 1 (`u1`, `Karim`)
  - credits: 129
  - coasters: 110
  - wishlist: 14
  - credit date range: `2025-11-20` to `2026-02-28`
- `family_export.cadel-only.json`
  - users: 1 (`u_mihzrqzy_wjurihrkb`, `Cadel`)
  - credits: 114
  - coasters: 110
  - wishlist: 0
  - credit date range: `2025-10-24` to `2026-01-03`

### Combined baseline (contains full credits)
- `family_export.two-profiles.cleaned.json`
  - users: 2
  - credits: 243 total
  - split:
    - `u1` (Karim): 129
    - `u_mihzrqzy_wjurihrkb` (Cadel): 114

### Files that are NOT suitable for credit recovery
- `family_export.karim-only.fresh-start.json` -> credits: 0
- `family_export.cadel-only.fresh-start.json` -> credits: 0
- `family_export.two-profiles.fresh-start.json` -> credits: 0

These are likely reset snapshots and should not be used to restore missing ride credits.

## Fresh Start Import Plan

### 1) Karim account import
Use Karim's authenticated Supabase user id as `--owner-id`.

```bash
npm run migrate:supabase -- --in ./family_export.karim-only.json --owner-id <KARIM_AUTH_UID> --dry-run
npm run migrate:supabase -- --in ./family_export.karim-only.json --owner-id <KARIM_AUTH_UID>
```

Expected prepared row counts:
- app_users: 1
- coasters: 110
- credits: 129
- wishlist: 14

### 2) Cadel account import
Use Cadel's authenticated Supabase user id as `--owner-id`.

```bash
npm run migrate:supabase -- --in ./family_export.cadel-only.json --owner-id <CADEL_AUTH_UID> --dry-run
npm run migrate:supabase -- --in ./family_export.cadel-only.json --owner-id <CADEL_AUTH_UID>
```

Expected prepared row counts:
- app_users: 1
- coasters: 110
- credits: 114
- wishlist: 0

## Validation Queries (Run after each import)

```sql
select id, name, owner_id from app_users where owner_id = '<AUTH_UID>';
select user_id, count(*) from credits where owner_id = '<AUTH_UID>' group by user_id;
select count(*) from wishlist where owner_id = '<AUTH_UID>';
```

Expected:
- Karim owner_id: 129 credits for user `u1`
- Cadel owner_id: 114 credits for user `u_mihzrqzy_wjurihrkb`

## Key Risk to Avoid
Do not import from any `*.fresh-start.json` file when recovering lost credits; those files intentionally contain zero credits.
