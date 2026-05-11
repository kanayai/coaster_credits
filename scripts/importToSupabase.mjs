import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const usage = `
Usage:
  node scripts/importToSupabase.mjs --in ./family_export.two-profiles.cleaned.json --owner-id <auth_uid>

Required env vars:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
`;

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  return args[idx + 1];
};

const inputPath = getArg('--in');
const ownerIdOverride = getArg('--owner-id');
const dryRun = args.includes('--dry-run');

if (!inputPath) {
  console.error('Missing --in path.');
  console.error(usage);
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error(usage);
  process.exit(1);
}

const inputAbsPath = path.resolve(process.cwd(), inputPath);
const raw = await fs.readFile(inputAbsPath, 'utf8');
const payload = JSON.parse(raw);

const users = Array.isArray(payload.users) ? payload.users : [];
const coasters = Array.isArray(payload.coasters) ? payload.coasters : [];
const credits = Array.isArray(payload.credits) ? payload.credits : [];
const wishlist = Array.isArray(payload.wishlist) ? payload.wishlist : [];

const inferredOwnerId = ownerIdOverride || users.find((u) => typeof u?.ownerId === 'string')?.ownerId || null;
if (!inferredOwnerId) {
  console.error('No owner id found. Pass --owner-id <supabase_auth_uid>.');
  process.exit(1);
}

const ownerId = inferredOwnerId;

const toDate = (value) => {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
};

const toDateOnly = (value) => {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
};

const toStringArray = (value) => (Array.isArray(value) ? value.filter((v) => typeof v === 'string') : null);

const usersRows = users
  .filter((u) => typeof u?.id === 'string' && typeof u?.name === 'string')
  .map((u) => ({
    id: u.id,
    owner_id:
      ownerIdOverride ||
      (typeof u.ownerId === 'string' && u.ownerId.length > 0 ? u.ownerId : ownerId),
    name: u.name,
    avatar_color: typeof u.avatarColor === 'string' ? u.avatarColor : 'bg-emerald-500',
    avatar_url: typeof u.avatarUrl === 'string' ? u.avatarUrl : null,
    rankings: u.rankings ?? null,
    high_score: Number.isFinite(Number(u.highScore)) ? Math.floor(Number(u.highScore)) : null,
  }));

const coastersRows = coasters
  .filter(
    (c) =>
      typeof c?.id === 'string' &&
      typeof c?.name === 'string' &&
      typeof c?.park === 'string' &&
      typeof c?.country === 'string' &&
      typeof c?.type === 'string' &&
      typeof c?.manufacturer === 'string'
  )
  .map((c) => ({
    id: c.id,
    name: c.name,
    park: c.park,
    country: c.country,
    type: c.type,
    manufacturer: c.manufacturer,
    image_url: typeof c.imageUrl === 'string' ? c.imageUrl : null,
    is_custom: Boolean(c.isCustom),
    specs: c.specs ?? null,
    variants: toStringArray(c.variants),
    audio_url: typeof c.audioUrl === 'string' ? c.audioUrl : null,
  }));

const userIds = new Set(usersRows.map((u) => u.id));
const coasterIds = new Set(coastersRows.map((c) => c.id));
const referencedCoasterIds = new Set(
  [...credits, ...wishlist]
    .map((row) => (typeof row?.coasterId === 'string' ? row.coasterId : null))
    .filter(Boolean)
);
const missingCoasterIds = [...referencedCoasterIds].filter((id) => !coasterIds.has(id));
const placeholderCoastersRows = missingCoasterIds.map((id) => ({
  id,
  // Keep placeholders explicit so imports can preserve credit history
  // even when source export lacks full coaster metadata.
  name: `Unknown coaster (${id})`,
  park: 'Unknown Park',
  country: 'Unknown',
  type: 'Unknown',
  manufacturer: 'Unknown',
  image_url: null,
  is_custom: true,
  specs: null,
  variants: null,
  audio_url: null,
}));
const allowedCoasterIds = new Set([...coasterIds, ...missingCoasterIds]);

const creditsRows = credits
  .filter((cr) => typeof cr?.id === 'string' && typeof cr?.userId === 'string' && typeof cr?.coasterId === 'string')
  .filter((cr) => userIds.has(cr.userId) && allowedCoasterIds.has(cr.coasterId))
  .map((cr) => ({
    id: cr.id,
    owner_id:
      ownerIdOverride ||
      (typeof cr.ownerId === 'string' && cr.ownerId.length > 0 ? cr.ownerId : ownerId),
    user_id: cr.userId,
    coaster_id: cr.coasterId,
    date: toDateOnly(cr.date) || new Date().toISOString().slice(0, 10),
    ride_count: Math.max(1, Math.floor(Number(cr.rideCount || 1))),
    photo_url: typeof cr.photoUrl === 'string' ? cr.photoUrl : null,
    gallery: toStringArray(cr.gallery),
    notes: typeof cr.notes === 'string' ? cr.notes : null,
    restraints: typeof cr.restraints === 'string' ? cr.restraints : null,
    variant: typeof cr.variant === 'string' ? cr.variant : null,
  }));

const wishlistRows = wishlist
  .filter((w) => typeof w?.id === 'string' && typeof w?.userId === 'string' && typeof w?.coasterId === 'string')
  .filter((w) => userIds.has(w.userId) && allowedCoasterIds.has(w.coasterId))
  .map((w) => ({
    id: w.id,
    owner_id:
      ownerIdOverride ||
      (typeof w.ownerId === 'string' && w.ownerId.length > 0 ? w.ownerId : ownerId),
    user_id: w.userId,
    coaster_id: w.coasterId,
    added_at: toDate(w.addedAt) || new Date().toISOString(),
    notes: typeof w.notes === 'string' ? w.notes : null,
  }));

console.log('Prepared row counts:');
console.log(`  app_users: ${usersRows.length}`);
console.log(`  coasters: ${coastersRows.length}`);
console.log(`  placeholder_coasters: ${placeholderCoastersRows.length}`);
console.log(`  credits: ${creditsRows.length}`);
console.log(`  wishlist: ${wishlistRows.length}`);

if (dryRun) {
  console.log('Dry run complete. No writes executed.');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const upsertInChunks = async (table, rows, onConflict = 'id') => {
  const batches = chunk(rows, 500);
  for (let i = 0; i < batches.length; i += 1) {
    const batch = batches[i];
    const { error } = await supabase.from(table).upsert(batch, { onConflict });
    if (error) {
      throw new Error(`Upsert failed for ${table} batch ${i + 1}/${batches.length}: ${error.message}`);
    }
    console.log(`  ${table}: batch ${i + 1}/${batches.length} ok (${batch.length} rows)`);
  }
};

const insertIgnoreDuplicatesInChunks = async (table, rows, onConflict = 'id') => {
  const batches = chunk(rows, 500);
  for (let i = 0; i < batches.length; i += 1) {
    const batch = batches[i];
    const { error } = await supabase.from(table).upsert(batch, { onConflict, ignoreDuplicates: true });
    if (error) {
      throw new Error(`Insert failed for ${table} batch ${i + 1}/${batches.length}: ${error.message}`);
    }
    console.log(`  ${table}: batch ${i + 1}/${batches.length} ok (${batch.length} rows)`);
  }
};

try {
  // Dependency order for FKs.
  await upsertInChunks('app_users', usersRows);
  await upsertInChunks('coasters', coastersRows);
  if (placeholderCoastersRows.length > 0) {
    await insertIgnoreDuplicatesInChunks('coasters', placeholderCoastersRows);
  }
  await upsertInChunks('credits', creditsRows);
  await upsertInChunks('wishlist', wishlistRows);
  console.log('Supabase import complete.');
} catch (error) {
  console.error(String(error));
  process.exit(1);
}
