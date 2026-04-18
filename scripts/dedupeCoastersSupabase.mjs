#!/usr/bin/env node

import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const usage = `
Usage:
  node scripts/dedupeCoastersSupabase.mjs [--apply]

Required env vars:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Behavior:
  - Finds duplicate coaster groups by normalized name+park+country
  - Selects a canonical coaster per group
  - Re-points credits/wishlist references to canonical ids
  - Deletes duplicate coaster rows

Default mode is dry-run. Pass --apply to execute writes.
`;

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const dryRun = !apply;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error(usage);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const normalize = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const makeKey = (coaster) => `${normalize(coaster.name)}|${normalize(coaster.park)}|${normalize(coaster.country)}`;

const toTs = (value) => {
  const ts = Date.parse(String(value || ''));
  return Number.isNaN(ts) ? Number.MAX_SAFE_INTEGER : ts;
};

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const fetchAll = async (table, columns) => {
  const pageSize = 1000;
  let from = 0;
  const all = [];
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase.from(table).select(columns).range(from, to);
    if (error) throw new Error(`Fetch failed for ${table}: ${error.message}`);
    const rows = data || [];
    all.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return all;
};

const chooseCanonical = (candidates, refCountById) => {
  const score = (coaster) => {
    let value = 0;
    value += (refCountById.get(coaster.id) || 0) * 1000;
    if (!coaster.is_custom) value += 100;
    if (coaster.image_url) value += 10;
    value -= toTs(coaster.created_at) / 1e11;
    return value;
  };

  return [...candidates].sort((a, b) => {
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  })[0];
};

const main = async () => {
  console.log(dryRun ? 'Mode: DRY RUN' : 'Mode: APPLY');

  const [coasters, credits, wishlist] = await Promise.all([
    fetchAll('coasters', 'id,name,park,country,is_custom,image_url,created_at'),
    fetchAll('credits', 'id,coaster_id'),
    fetchAll('wishlist', 'id,owner_id,user_id,coaster_id'),
  ]);

  const byKey = new Map();
  for (const coaster of coasters) {
    if (!coaster?.id) continue;
    const key = makeKey(coaster);
    const list = byKey.get(key) || [];
    list.push(coaster);
    byKey.set(key, list);
  }

  const duplicateGroups = [...byKey.entries()]
    .map(([key, rows]) => ({ key, rows }))
    .filter((group) => group.rows.length > 1)
    .sort((a, b) => b.rows.length - a.rows.length);

  if (duplicateGroups.length === 0) {
    console.log('No duplicate coaster groups found.');
    return;
  }

  const refCountById = new Map();
  for (const credit of credits) {
    const id = credit.coaster_id;
    if (!id) continue;
    refCountById.set(id, (refCountById.get(id) || 0) + 1);
  }
  for (const row of wishlist) {
    const id = row.coaster_id;
    if (!id) continue;
    refCountById.set(id, (refCountById.get(id) || 0) + 1);
  }

  const mappings = [];
  for (const group of duplicateGroups) {
    const canonical = chooseCanonical(group.rows, refCountById);
    const duplicates = group.rows.filter((row) => row.id !== canonical.id).map((row) => row.id);
    mappings.push({ key: group.key, canonical, duplicates, size: group.rows.length });
  }

  const dupIds = mappings.flatMap((m) => m.duplicates);
  const canonicalByDupId = new Map();
  for (const m of mappings) {
    for (const dupId of m.duplicates) canonicalByDupId.set(dupId, m.canonical.id);
  }

  const dupIdSet = new Set(dupIds);
  const creditRowsToRepoint = credits.filter((row) => dupIdSet.has(row.coaster_id));

  const wishlistByCoaster = new Map();
  for (const row of wishlist) {
    const list = wishlistByCoaster.get(row.coaster_id) || [];
    list.push(row);
    wishlistByCoaster.set(row.coaster_id, list);
  }

  const wishlistDeletes = [];
  const wishlistUpdates = [];

  for (const m of mappings) {
    const canonicalId = m.canonical.id;
    const canonicalRows = wishlistByCoaster.get(canonicalId) || [];
    const canonicalKeySet = new Set(canonicalRows.map((row) => `${row.owner_id}|${row.user_id}`));

    for (const dupId of m.duplicates) {
      const dupRows = wishlistByCoaster.get(dupId) || [];
      for (const row of dupRows) {
        const pairKey = `${row.owner_id}|${row.user_id}`;
        if (canonicalKeySet.has(pairKey)) {
          wishlistDeletes.push(row.id);
        } else {
          wishlistUpdates.push({ id: row.id, coaster_id: canonicalId });
          canonicalKeySet.add(pairKey);
        }
      }
    }
  }

  console.log(`Duplicate groups: ${mappings.length}`);
  console.log(`Duplicate coaster rows to remove: ${dupIds.length}`);
  console.log(`Credits to repoint: ${creditRowsToRepoint.length}`);
  console.log(`Wishlist rows to repoint: ${wishlistUpdates.length}`);
  console.log(`Wishlist rows to delete (unique collisions): ${wishlistDeletes.length}`);

  const sample = mappings.slice(0, 10).map((m) => ({
    key: m.key,
    canonical: m.canonical.id,
    duplicates: m.duplicates,
    groupSize: m.size,
  }));
  console.log('Sample groups:', JSON.stringify(sample, null, 2));

  if (dryRun) {
    console.log('Dry run complete. No writes executed.');
    return;
  }

  let creditsUpdated = 0;
  for (const dupId of dupIds) {
    const canonicalId = canonicalByDupId.get(dupId);
    const { error, count } = await supabase
      .from('credits')
      .update({ coaster_id: canonicalId })
      .eq('coaster_id', dupId)
      .select('id', { count: 'exact', head: true });
    if (error) throw new Error(`credits update failed for ${dupId} -> ${canonicalId}: ${error.message}`);
    creditsUpdated += count || 0;
  }

  let wishlistUpdated = 0;
  for (const patch of wishlistUpdates) {
    const { error } = await supabase.from('wishlist').update({ coaster_id: patch.coaster_id }).eq('id', patch.id);
    if (error) throw new Error(`wishlist update failed for ${patch.id}: ${error.message}`);
    wishlistUpdated += 1;
  }

  let wishlistDeleted = 0;
  for (const batch of chunk(wishlistDeletes, 500)) {
    const { error, count } = await supabase
      .from('wishlist')
      .delete()
      .in('id', batch)
      .select('id', { count: 'exact', head: true });
    if (error) throw new Error(`wishlist delete failed: ${error.message}`);
    wishlistDeleted += count || 0;
  }

  let coastersDeleted = 0;
  for (const batch of chunk(dupIds, 500)) {
    const { error, count } = await supabase
      .from('coasters')
      .delete()
      .in('id', batch)
      .select('id', { count: 'exact', head: true });
    if (error) throw new Error(`coasters delete failed: ${error.message}`);
    coastersDeleted += count || 0;
  }

  console.log('Apply complete:');
  console.log(`  credits updated: ${creditsUpdated}`);
  console.log(`  wishlist updated: ${wishlistUpdated}`);
  console.log(`  wishlist deleted (collision): ${wishlistDeleted}`);
  console.log(`  duplicate coasters deleted: ${coastersDeleted}`);
};

main().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
