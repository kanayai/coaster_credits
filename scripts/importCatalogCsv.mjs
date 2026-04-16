#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const usage = `
Usage:
  node scripts/importCatalogCsv.mjs --in ./coaster_db.csv [--out-json ./coasters.import.preview.json] [--apply]

What it does:
  - Parses a coaster CSV (Kaggle/RobMulla format supported)
  - Normalizes fields to this app's coaster schema
  - Dedupes by normalized name+park+country
  - Reuses existing Supabase coaster IDs by identity (when applying)
  - Upserts only the coasters table

Modes:
  - Default: dry run (no cloud writes)
  - --apply: upsert into Supabase coasters table (requires env vars)

Required env vars for --apply:
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
const outJsonPath = getArg('--out-json');
const apply = args.includes('--apply');
const dryRun = !apply;

if (!inputPath) {
  console.error('Missing --in path.');
  console.error(usage);
  process.exit(1);
}

const normalizeText = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const cleanText = (value) => String(value || '').trim().replace(/\s+/g, ' ');
const identityKey = (name, park, country) => `${normalizeText(name)}|${normalizeText(park)}|${normalizeText(country)}`;

const inferType = (value) => {
  const raw = normalizeText(value);
  if (!raw) return 'Steel';
  if (raw.includes('wood')) return 'Wooden';
  if (raw.includes('hybrid')) return 'Hybrid';
  if (raw.includes('alpine')) return 'Alpine';
  if (raw.includes('family')) return 'Family';
  if (raw.includes('bobsled')) return 'Bobsled';
  if (raw.includes('powered') || raw.includes('motor')) return 'Powered';
  return 'Steel';
};

const pick = (row, keys) => {
  for (const key of keys) {
    if (typeof row[key] === 'string' && row[key].trim()) return row[key].trim();
  }
  return '';
};

const fnv1a = (input) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

const makeCoasterId = (name, park, country) => `ext_${fnv1a(identityKey(name, park, country))}`;

const parseCsv = (text) => {
  const rows = [];
  const header = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let isHeader = true;

  const pushField = () => {
    row.push(field);
    field = '';
  };

  const pushRow = () => {
    if (isHeader) {
      for (const raw of row) header.push(raw.replace(/^\uFEFF/, '').trim());
      isHeader = false;
    } else if (!(row.length === 1 && row[0] === '')) {
      const obj = {};
      for (let i = 0; i < header.length; i += 1) {
        obj[header[i]] = row[i] ?? '';
      }
      rows.push(obj);
    }
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ',') {
      pushField();
      continue;
    }

    if (ch === '\n') {
      pushField();
      pushRow();
      continue;
    }

    if (ch === '\r') {
      continue;
    }

    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }

  return rows;
};

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const csvAbs = path.resolve(process.cwd(), inputPath);
const csvRaw = await fs.readFile(csvAbs, 'utf8');
const csvRows = parseCsv(csvRaw);

const normalizedRows = [];
for (const row of csvRows) {
  const name = cleanText(pick(row, ['coaster_name', 'Name', 'name']));
  const park = cleanText(pick(row, ['Location', 'location', 'park', 'Park']));
  const country = cleanText(pick(row, ['Country', 'country']));
  const manufacturer = cleanText(pick(row, ['Manufacturer', 'manufacturer'])) || 'Unknown';
  const type = inferType(pick(row, ['Type_Main', 'Type', 'type']));

  if (!name || !park) continue;

  normalizedRows.push({
    name,
    park,
    country: country || 'Unknown',
    type,
    manufacturer,
    image_url: null,
    is_custom: false,
    specs: null,
    variants: null,
    audio_url: null,
  });
}

const byIdentity = new Map();
for (const coaster of normalizedRows) {
  const key = identityKey(coaster.name, coaster.park, coaster.country);
  if (!byIdentity.has(key)) {
    byIdentity.set(key, coaster);
    continue;
  }

  const existing = byIdentity.get(key);
  if (existing.manufacturer === 'Unknown' && coaster.manufacturer !== 'Unknown') {
    byIdentity.set(key, coaster);
  }
}

let existingByIdentity = new Map();
if (apply) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    console.error(usage);
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const pageSize = 1000;
  let from = 0;
  const existing = [];
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('coasters')
      .select('id,name,park,country,is_custom,image_url,specs,variants,audio_url')
      .range(from, to);
    if (error) {
      console.error(`Failed loading existing coasters: ${error.message}`);
      process.exit(1);
    }
    const rows = data || [];
    existing.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }

  existingByIdentity = new Map(
    existing.map((row) => [identityKey(row.name, row.park, row.country), row])
  );
}

const coastersRows = [...byIdentity.values()].map((coaster) => {
  const key = identityKey(coaster.name, coaster.park, coaster.country);
  const existing = existingByIdentity.get(key);
  const id = existing?.id || makeCoasterId(coaster.name, coaster.park, coaster.country);

  return {
    id,
    name: coaster.name,
    park: coaster.park,
    country: coaster.country,
    type: coaster.type,
    manufacturer: coaster.manufacturer,
    image_url: existing?.image_url ?? coaster.image_url,
    is_custom: typeof existing?.is_custom === 'boolean' ? existing.is_custom : coaster.is_custom,
    specs: existing?.specs ?? coaster.specs,
    variants: existing?.variants ?? coaster.variants,
    audio_url: existing?.audio_url ?? coaster.audio_url,
  };
});

const createdCount = coastersRows.filter((row) => !existingByIdentity.has(identityKey(row.name, row.park, row.country))).length;
const reusedCount = coastersRows.length - createdCount;

console.log(`CSV rows parsed: ${csvRows.length}`);
console.log(`Rows normalized (name+park present): ${normalizedRows.length}`);
console.log(`Unique coaster identities from CSV: ${coastersRows.length}`);
if (apply) {
  console.log(`Will create new rows: ${createdCount}`);
  console.log(`Will update/reuse existing rows: ${reusedCount}`);
}

if (outJsonPath) {
  const outAbs = path.resolve(process.cwd(), outJsonPath);
  await fs.writeFile(outAbs, JSON.stringify(coastersRows, null, 2) + '\n', 'utf8');
  console.log(`Wrote preview JSON: ${outAbs}`);
}

if (dryRun) {
  const sample = coastersRows.slice(0, 10).map((row) => ({
    id: row.id,
    name: row.name,
    park: row.park,
    country: row.country,
    type: row.type,
    manufacturer: row.manufacturer,
  }));
  console.log('Sample rows:', JSON.stringify(sample, null, 2));
  console.log('Dry run complete. No writes executed.');
  process.exit(0);
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

for (const batch of chunk(coastersRows, 500)) {
  const { error } = await supabase.from('coasters').upsert(batch, { onConflict: 'id' });
  if (error) {
    console.error(`Upsert failed: ${error.message}`);
    process.exit(1);
  }
}

console.log(`Apply complete. Upserted ${coastersRows.length} coaster rows.`);
