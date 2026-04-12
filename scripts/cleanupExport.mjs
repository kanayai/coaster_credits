#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const usage = `
Usage:
  node scripts/cleanupExport.mjs --in <input.json> [--out <cleaned.json>] [--keep-user-id <id>] [--dedupe-credits]

What it does:
  - Normalizes export shape (object or credits-only array)
  - Picks a keeper profile id (or uses --keep-user-id)
  - Remaps all credits/wishlist userId values to the keeper id
  - Keeps only one user profile (the keeper) in users[]
  - Writes a duplicate report file next to output
  - Does NOT remove credits unless --dedupe-credits is set
`;

const parseArgs = (argv) => {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
};

const args = parseArgs(process.argv);
const inputPath = args.in;
if (!inputPath) {
  console.error(usage.trim());
  process.exit(1);
}

const outPath =
  args.out ||
  path.join(
    path.dirname(inputPath),
    `${path.basename(inputPath, path.extname(inputPath))}.cleaned.json`
  );
const dedupeCredits = Boolean(args['dedupe-credits']);

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const writeJson = (filePath, data) =>
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const raw = readJson(inputPath);
const normalized = Array.isArray(raw)
  ? { users: [], coasters: [], credits: raw, wishlist: [] }
  : {
      users: ensureArray(raw.users),
      coasters: ensureArray(raw.coasters),
      credits: ensureArray(raw.credits),
      wishlist: ensureArray(raw.wishlist),
      ...raw,
    };

const creditsByUser = new Map();
for (const c of normalized.credits) {
  if (!c || typeof c !== 'object') continue;
  const uid = c.userId;
  if (typeof uid !== 'string' || !uid) continue;
  creditsByUser.set(uid, (creditsByUser.get(uid) || 0) + 1);
}

const userIdsByVolume = [...creditsByUser.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([uid]) => uid);

const keepUserId =
  (typeof args['keep-user-id'] === 'string' && args['keep-user-id']) ||
  userIdsByVolume[0] ||
  (normalized.users[0] && normalized.users[0].id);

if (!keepUserId) {
  console.error('Could not determine keeper user id. Provide --keep-user-id explicitly.');
  process.exit(1);
}

const sourceUserIds = new Set([
  ...normalized.users.map((u) => u?.id).filter((v) => typeof v === 'string'),
  ...normalized.credits.map((c) => c?.userId).filter((v) => typeof v === 'string'),
  ...normalized.wishlist.map((w) => w?.userId).filter((v) => typeof v === 'string'),
]);

const remapUserId = (uid) => {
  if (typeof uid !== 'string' || !uid) return keepUserId;
  return uid === keepUserId ? keepUserId : keepUserId;
};

const keeperUserFromInput =
  normalized.users.find((u) => u?.id === keepUserId) ||
  normalized.users.find((u) => typeof u?.id === 'string' && userIdsByVolume.includes(u.id));

const cleanedUsers =
  keeperUserFromInput && typeof keeperUserFromInput === 'object'
    ? [{ ...keeperUserFromInput, id: keepUserId }]
    : [{ id: keepUserId, name: 'Primary Rider', avatarColor: 'bg-emerald-500', ownerId: 'local' }];

let cleanedCredits = normalized.credits.map((c) => ({
  ...c,
  userId: remapUserId(c?.userId),
}));

if (dedupeCredits) {
  const seen = new Set();
  cleanedCredits = cleanedCredits.filter((c) => {
    const key = [
      c.userId || '',
      c.coasterId || '',
      c.date || '',
      c.variant || '',
      c.rideCount ?? 1,
      c.notes || '',
      c.restraints || '',
    ].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const cleanedWishlist = normalized.wishlist.map((w) => ({
  ...w,
  userId: remapUserId(w?.userId),
}));

const duplicateBuckets = new Map();
for (const c of cleanedCredits) {
  const key = [
    c.userId || '',
    c.coasterId || '',
    c.date || '',
    c.variant || '',
  ].join('|');
  const list = duplicateBuckets.get(key) || [];
  list.push(c.id || '(no-id)');
  duplicateBuckets.set(key, list);
}

const duplicateReport = [...duplicateBuckets.entries()]
  .filter(([, ids]) => ids.length > 1)
  .map(([key, ids]) => ({ key, count: ids.length, creditIds: ids }))
  .sort((a, b) => b.count - a.count);

const cleaned = {
  ...normalized,
  users: cleanedUsers,
  credits: cleanedCredits,
  wishlist: cleanedWishlist,
  cleanedAt: new Date().toISOString(),
  cleanup: {
    keepUserId,
    sourceUserIds: [...sourceUserIds].sort(),
    dedupeCredits,
  },
};

writeJson(outPath, cleaned);

const reportPath = path.join(
  path.dirname(outPath),
  `${path.basename(outPath, path.extname(outPath))}.duplicates-report.json`
);
writeJson(reportPath, {
  generatedAt: new Date().toISOString(),
  keepUserId,
  totalCredits: cleanedCredits.length,
  duplicateGroups: duplicateReport.length,
  duplicates: duplicateReport,
});

console.log(`Input:  ${inputPath}`);
console.log(`Output: ${outPath}`);
console.log(`Report: ${reportPath}`);
console.log(`Keeper profile: ${keepUserId}`);
console.log(`Credits: ${normalized.credits.length} -> ${cleanedCredits.length}`);
console.log(`Duplicate groups found: ${duplicateReport.length}`);
