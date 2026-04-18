<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/c55a05e7-31ba-44fc-89d3-48f0dfdfab8b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set `GEMINI_API_KEY` in `.env.local` to your Gemini API key
   The app still supports the legacy `API_KEY` alias internally, but `GEMINI_API_KEY` is the canonical name.
3. Run the app:
   `npm run dev`

## Supabase Migration

- Runbook: `docs/SUPABASE_MIGRATION.md`
- Schema SQL: `supabase/schema.sql`
- Import command:
  `npm run migrate:supabase -- --in ./family_export.two-profiles.cleaned.json --owner-id <supabase_auth_uid>`
- Runtime backend toggle (Vite env):
  - `VITE_DATA_BACKEND=supabase`
  - `VITE_SUPABASE_URL=https://<project-ref>.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=<anon-key>`

## Import Large Coaster Catalog CSV

Use this to import the RobMulla/Kaggle roller coaster dataset into Supabase `coasters`.

1. Download `coaster_db.csv` from:
   - https://www.kaggle.com/datasets/robikscube/rollercoaster-database
2. Dry run parse + normalize + dedupe:
   - `npm run import:coasters:csv -- --in ./coaster_db.csv --out-json ./coasters.import.preview.json`
3. Apply to Supabase:
   - `export SUPABASE_URL=https://<project-ref>.supabase.co`
   - `export SUPABASE_SERVICE_ROLE_KEY=<service-role-key>`
   - `npm run import:coasters:csv -- --in ./coaster_db.csv --apply`

## Dedupe Exact Coaster Duplicates In Supabase

Use this to merge exact duplicate coaster identities by normalized `name + park + country`.

1. Dry run:
   - `export SUPABASE_URL=https://<project-ref>.supabase.co`
   - `export SUPABASE_SERVICE_ROLE_KEY=<service-role-key>`
   - `npm run dedupe:coasters:supabase`
2. Apply changes:
   - `npm run dedupe:coasters:supabase -- --apply`

## Deployment Security Note

- Do not pass `GEMINI_API_KEY` as a Docker build argument or Dockerfile `ENV`.
- Build-time injection bakes secrets into image layers/history.
- Keep production secrets in Secret Manager and only inject them at runtime via a backend/proxy service.
