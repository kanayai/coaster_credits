import type { Coaster, Credit, User, WishlistEntry } from '../types';
import { supabase } from './supabaseClient';

const assertClient = () => {
  if (!supabase) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  return supabase;
};

const cleanArray = (value: unknown): string[] | null =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : null;

const toDateOnly = (value: unknown): string => {
  const date = new Date(typeof value === 'string' ? value : Date.now());
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
};

const toIso = (value: unknown): string => {
  const date = new Date(typeof value === 'string' ? value : Date.now());
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const userToRow = (user: User) => ({
  id: user.id,
  owner_id: user.ownerId,
  name: user.name,
  avatar_color: user.avatarColor,
  avatar_url: user.avatarUrl ?? null,
  rankings: user.rankings ?? null,
  high_score: Number.isFinite(Number(user.highScore)) ? Math.floor(Number(user.highScore)) : null,
});

const coasterToRow = (coaster: Coaster) => ({
  id: coaster.id,
  name: coaster.name,
  park: coaster.park,
  country: coaster.country,
  type: coaster.type,
  manufacturer: coaster.manufacturer,
  image_url: coaster.imageUrl ?? null,
  is_custom: Boolean(coaster.isCustom),
  specs: coaster.specs ?? null,
  variants: cleanArray(coaster.variants),
  audio_url: coaster.audioUrl ?? null,
});

const creditToRow = (credit: Credit) => ({
  id: credit.id,
  owner_id: credit.ownerId,
  user_id: credit.userId,
  coaster_id: credit.coasterId,
  date: toDateOnly(credit.date),
  ride_count: Math.max(1, Math.floor(Number(credit.rideCount || 1))),
  photo_url: credit.photoUrl ?? null,
  gallery: cleanArray(credit.gallery),
  notes: credit.notes ?? null,
  restraints: credit.restraints ?? null,
  variant: credit.variant ?? null,
});

const wishlistToRow = (entry: WishlistEntry) => ({
  id: entry.id,
  owner_id: entry.ownerId,
  user_id: entry.userId,
  coaster_id: entry.coasterId,
  added_at: toIso(entry.addedAt),
  notes: entry.notes ?? null,
});

const rowToUser = (row: any): User => ({
  id: row.id,
  ownerId: row.owner_id,
  name: row.name,
  avatarColor: row.avatar_color,
  avatarUrl: row.avatar_url ?? undefined,
  rankings: row.rankings ?? undefined,
  highScore: typeof row.high_score === 'number' ? row.high_score : undefined,
});

const rowToCoaster = (row: any): Coaster => ({
  id: row.id,
  name: row.name,
  park: row.park,
  country: row.country,
  type: row.type,
  manufacturer: row.manufacturer,
  imageUrl: row.image_url ?? undefined,
  isCustom: Boolean(row.is_custom),
  specs: row.specs ?? undefined,
  variants: cleanArray(row.variants) ?? undefined,
  audioUrl: row.audio_url ?? undefined,
});

const rowToCredit = (row: any): Credit => ({
  id: row.id,
  ownerId: row.owner_id,
  userId: row.user_id,
  coasterId: row.coaster_id,
  date: row.date,
  rideCount: row.ride_count,
  photoUrl: row.photo_url ?? undefined,
  gallery: cleanArray(row.gallery) ?? undefined,
  notes: row.notes ?? undefined,
  restraints: row.restraints ?? undefined,
  variant: row.variant ?? undefined,
});

const rowToWishlist = (row: any): WishlistEntry => ({
  id: row.id,
  ownerId: row.owner_id,
  userId: row.user_id,
  coasterId: row.coaster_id,
  addedAt: row.added_at,
  notes: row.notes ?? undefined,
});

const upsertChunked = async (table: string, rows: any[]) => {
  if (rows.length === 0) return;
  const client = assertClient();
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await client.from(table).upsert(batch, { onConflict: 'id' });
    if (error) throw new Error(error.message);
  }
};

export const upsertUsers = async (users: User[]) => upsertChunked('app_users', users.map(userToRow));
export const upsertCoasters = async (coasters: Coaster[]) => upsertChunked('coasters', coasters.map(coasterToRow));
export const upsertCredits = async (credits: Credit[]) => upsertChunked('credits', credits.map(creditToRow));
export const upsertWishlist = async (entries: WishlistEntry[]) =>
  upsertChunked('wishlist', entries.map(wishlistToRow));

export const deleteById = async (table: 'credits' | 'wishlist' | 'coasters' | 'app_users', id: string) => {
  const client = assertClient();
  const { error } = await client.from(table).delete().eq('id', id);
  if (error) throw new Error(error.message);
};

export const updateCredit = async (creditId: string, patch: Partial<Credit>) => {
  const client = assertClient();
  const payload: Record<string, unknown> = {};
  if (patch.date !== undefined) payload.date = toDateOnly(patch.date);
  if (patch.notes !== undefined) payload.notes = patch.notes ?? null;
  if (patch.restraints !== undefined) payload.restraints = patch.restraints ?? null;
  if (patch.photoUrl !== undefined) payload.photo_url = patch.photoUrl ?? null;
  if (patch.gallery !== undefined) payload.gallery = cleanArray(patch.gallery);
  if (patch.variant !== undefined) payload.variant = patch.variant ?? null;
  if (patch.rideCount !== undefined) payload.ride_count = Math.max(1, Math.floor(Number(patch.rideCount || 1)));
  const { error } = await client.from('credits').update(payload).eq('id', creditId);
  if (error) throw new Error(error.message);
};

export const updateCoaster = async (coasterId: string, patch: Partial<Coaster>) => {
  const client = assertClient();
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.park !== undefined) payload.park = patch.park;
  if (patch.country !== undefined) payload.country = patch.country;
  if (patch.type !== undefined) payload.type = patch.type;
  if (patch.manufacturer !== undefined) payload.manufacturer = patch.manufacturer;
  if (patch.imageUrl !== undefined) payload.image_url = patch.imageUrl ?? null;
  if (patch.isCustom !== undefined) payload.is_custom = Boolean(patch.isCustom);
  if (patch.specs !== undefined) payload.specs = patch.specs ?? null;
  if (patch.variants !== undefined) payload.variants = cleanArray(patch.variants);
  if (patch.audioUrl !== undefined) payload.audio_url = patch.audioUrl ?? null;
  const { error } = await client.from('coasters').update(payload).eq('id', coasterId);
  if (error) throw new Error(error.message);
};

export const updateUser = async (userId: string, patch: Partial<User>) => {
  const client = assertClient();
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.avatarColor !== undefined) payload.avatar_color = patch.avatarColor;
  if (patch.avatarUrl !== undefined) payload.avatar_url = patch.avatarUrl ?? null;
  if (patch.rankings !== undefined) payload.rankings = patch.rankings ?? null;
  if (patch.highScore !== undefined) payload.high_score = patch.highScore ?? null;
  const { error } = await client.from('app_users').update(payload).eq('id', userId);
  if (error) throw new Error(error.message);
};

export const loadOwnerData = async (ownerId: string) => {
  const client = assertClient();

  const [usersRes, coastersRes, creditsRes, wishlistRes] = await Promise.all([
    client.from('app_users').select('*').eq('owner_id', ownerId),
    client.from('coasters').select('*'),
    client.from('credits').select('*').eq('owner_id', ownerId),
    client.from('wishlist').select('*').eq('owner_id', ownerId),
  ]);

  if (usersRes.error) throw new Error(usersRes.error.message);
  if (coastersRes.error) throw new Error(coastersRes.error.message);
  if (creditsRes.error) throw new Error(creditsRes.error.message);
  if (wishlistRes.error) throw new Error(wishlistRes.error.message);

  return {
    users: (usersRes.data || []).map(rowToUser),
    coasters: (coastersRes.data || []).map(rowToCoaster),
    credits: (creditsRes.data || []).map(rowToCredit),
    wishlist: (wishlistRes.data || []).map(rowToWishlist),
  };
};
