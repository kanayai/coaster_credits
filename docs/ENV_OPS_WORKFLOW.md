# Env Ops Workflow

Use one local file for all recurring credentials and IDs.

## 1) Create your local ops env file

```bash
cp .env.ops.template .env.ops.local
```

Fill real values in `.env.ops.local`.

## 2) Load it into your shell for a session

```bash
set -a
source .env.ops.local
set +a
```

## 3) Run common commands without retyping vars

Karim import:

```bash
npm run migrate:supabase -- --in ./family_export.karim-only.json --owner-id "$KARIM_AUTH_UID" --dry-run
npm run migrate:supabase -- --in ./family_export.karim-only.json --owner-id "$KARIM_AUTH_UID"
```

Cadel import:

```bash
npm run migrate:supabase -- --in ./family_export.cadel-only.json --owner-id "$CADEL_AUTH_UID" --dry-run
npm run migrate:supabase -- --in ./family_export.cadel-only.json --owner-id "$CADEL_AUTH_UID"
```

## Notes

- Keep `.env.ops.local` private.
- `SUPABASE_SERVICE_ROLE_KEY` is sensitive and must not be exposed to frontend code.
- `.env.ops.template` is safe to commit because it contains placeholders only.
