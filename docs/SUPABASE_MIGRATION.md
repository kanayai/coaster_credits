# Supabase Migration Runbook

This project is currently blocked by earlier cloud database quota limits. Use this runbook to migrate exported data into Supabase.

## 1. Create schema

Open Supabase SQL editor and run:

- `supabase/schema.sql`

This creates:

- `app_users`
- `coasters`
- `credits`
- `wishlist`

with indexes, foreign keys, and baseline RLS policies.

## 2. Install dependencies

```bash
npm install
```

## 3. Set environment variables

Use your Supabase project values:

```bash
export SUPABASE_URL="https://<project-ref>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
```

## 4. Dry run import

Use your cleaned export JSON and the target Supabase auth user id as owner:

```bash
npm run migrate:supabase -- --in ./family_export.two-profiles.cleaned.json --owner-id <supabase_auth_uid> --dry-run
```

## 5. Execute import

```bash
npm run migrate:supabase -- --in ./family_export.two-profiles.cleaned.json --owner-id <supabase_auth_uid>
```

## Notes

- Import is id-preserving: existing IDs are reused for users/coasters/credits/wishlist.
- Upserts are chunked in batches of 500 rows.
- Credits/wishlist rows are skipped if referenced user/coaster IDs are missing.
- `--owner-id` is required when rows do not already include `ownerId`.

## Suggested verification queries

```sql
select count(*) from app_users;
select count(*) from coasters;
select count(*) from credits;
select count(*) from wishlist;
```
