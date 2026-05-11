import type { Dispatch, SetStateAction } from 'react';
import { CoasterType, type Coaster, type Credit, type RankingList, type User, type WishlistEntry } from '../types';
import { INITIAL_USERS, cleanName, normalizeCountry, normalizeManufacturer, normalizeParkName } from '../constants';
import type { AppAuthUser } from '../services/authTypes';
import {
  deleteById,
  upsertCoasters,
  upsertCredits,
  upsertUsers,
  upsertWishlist,
  updateUser as updateSupabaseUser,
  updateCredit as updateSupabaseCredit,
  loadOwnerData,
} from '../services/supabaseData';
import { storage } from '../services/storage';

type NotificationType = 'success' | 'error' | 'info';
type ShowNotification = (message: string, type?: NotificationType) => void;
type GenerateId = (prefix: string) => string;
type CompressImage = (file: File) => Promise<string>;

interface BaseDataContext {
  currentUser: AppAuthUser | null;
  activeUser: User | null;
  users: User[];
  coasters: Coaster[];
  credits: Credit[];
  wishlist: WishlistEntry[];
  setUsers: Dispatch<SetStateAction<User[]>>;
  setCoasters: Dispatch<SetStateAction<Coaster[]>>;
  setCredits: Dispatch<SetStateAction<Credit[]>>;
  setWishlist: Dispatch<SetStateAction<WishlistEntry[]>>;
  setIsSyncing: Dispatch<SetStateAction<boolean>>;
  showNotification: ShowNotification;
  generateId: GenerateId;
  compressImage: CompressImage;
  manualRefresh: () => void;
  switchUser: (userId: string) => void;
}

const ownerScopedDefaultUsers = (ownerId: string): User[] =>
  INITIAL_USERS.map((user, index) => ({
    ...user,
    id: `u_${ownerId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${index + 1}`,
    ownerId,
  }));

const cleanImportedData = (obj: any): any => {
  if (obj === null || obj === undefined) return undefined;
  if (Array.isArray(obj)) {
    return obj.map((v) => cleanImportedData(v)).filter((v) => v !== undefined);
  }
  if (typeof obj === 'object') {
    const newObj: any = {};
    let hasData = false;

    Object.keys(obj).forEach((key) => {
      const val = obj[key];
      if (val === undefined || val === null || val === '') return;

      if (key === 'date' || key === 'addedAt') {
        try {
          const d = new Date(val);
          if (!isNaN(d.getTime())) {
            newObj[key] = d.toISOString();
            hasData = true;
          }
        } catch {
          newObj[key] = val;
          hasData = true;
        }
      } else if (key === 'rideCount' || key === 'highScore' || key === 'inversions') {
        const num = Math.floor(Number(val));
        if (!isNaN(num)) {
          newObj[key] = num;
          hasData = true;
        }
      } else {
        const cleanedVal = cleanImportedData(val);
        if (cleanedVal !== undefined) {
          newObj[key] = cleanedVal;
          hasData = true;
        }
      }
    });

    return hasData ? newObj : undefined;
  }
  return obj;
};

const trimRankings = (rankings: any) => {
  if (!rankings) return rankings;
  const limitArray = (arr: any[]) => (arr && arr.length > 2000 ? arr.slice(0, 2000) : arr);
  return {
    ...rankings,
    overall: limitArray(rankings.overall),
    steel: limitArray(rankings.steel),
    wooden: limitArray(rankings.wooden),
  };
};

const isAllowedUrl = (value: unknown): value is string =>
  typeof value === 'string' &&
  (/^https?:\/\//.test(value) || /^data:image\//.test(value) || /^\//.test(value));

const sanitizeGallery = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const cleaned = value.filter((item): item is string => isAllowedUrl(item));
  return cleaned.length > 0 ? cleaned : undefined;
};

const validId = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && !value.includes('/');

export const addUserAction = async (
  context: Pick<
    BaseDataContext,
    'compressImage' | 'currentUser' | 'generateId' | 'setUsers' | 'showNotification' | 'switchUser' | 'users'
  >,
  name: string,
  photo?: File,
  id?: string
) => {
  const { compressImage, currentUser, generateId, setUsers, showNotification, switchUser, users } = context;
  let avatarUrl;
  if (photo) avatarUrl = await compressImage(photo);

  const newUser: User = {
    id: id || generateId('u'),
    ownerId: currentUser?.uid || 'local',
    name,
    avatarColor: 'bg-emerald-500',
    avatarUrl,
  };

  if (currentUser) {
    try {
      await upsertUsers([newUser]);
      setUsers((prev) => [...prev, newUser]);
      switchUser(newUser.id);
      showNotification('Profile created', 'success');
    } catch (err) {
      showNotification(`Supabase profile create failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
    return;
  }

  const updatedUsers = [...users, newUser];
  setUsers(updatedUsers);
  await storage.set('cc_users', updatedUsers);
  switchUser(newUser.id);
  showNotification('Local profile created!');
};

export const updateUserAction = async (
  context: Pick<
    BaseDataContext,
    'compressImage' | 'currentUser' | 'setUsers' | 'showNotification' | 'users'
  >,
  userId: string,
  newName: string,
  photo?: File
) => {
  const { compressImage, currentUser, setUsers, showNotification, users } = context;
  let avatarUrl;
  if (photo) avatarUrl = await compressImage(photo);

  if (currentUser) {
    try {
      const updatedUsers = users.map((user) =>
        user.id === userId ? { ...user, name: newName, ...(avatarUrl ? { avatarUrl } : {}) } : user
      );
      await updateSupabaseUser(userId, {
        name: newName,
        ...(avatarUrl ? { avatarUrl } : {}),
      });
      setUsers(updatedUsers);
      showNotification('Profile updated');
    } catch (err) {
      showNotification(`Supabase profile update failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
    return;
  }

  const updatedUsers = users.map((user) =>
    user.id === userId ? { ...user, name: newName, ...(avatarUrl ? { avatarUrl } : {}) } : user
  );
  setUsers(updatedUsers);
  await storage.set('cc_users', updatedUsers);
  showNotification('Local profile updated');
};

export const deleteUserAction = async (
  context: Pick<
    BaseDataContext,
    'activeUser' | 'credits' | 'currentUser' | 'setCredits' | 'setUsers' | 'setWishlist' | 'showNotification' | 'switchUser' | 'users' | 'wishlist'
  >,
  userId: string
) => {
  const { activeUser, credits, currentUser, setCredits, setUsers, setWishlist, showNotification, switchUser, users, wishlist } = context;
  if (users.length <= 1) {
    showNotification('Cannot delete the only profile', 'error');
    return;
  }

  const user = users.find((u) => u.id === userId);
  if (!user) return;
  if (!window.confirm(`Delete profile "${user.name}" and all its credits/wishlist entries?`)) return;

  const updatedUsers = users.filter((u) => u.id !== userId);
  const updatedCredits = credits.filter((c) => c.userId !== userId);
  const updatedWishlist = wishlist.filter((w) => w.userId !== userId);

  if (currentUser) {
    try {
      await deleteById('app_users', userId);
      setUsers(updatedUsers);
      setCredits(updatedCredits);
      setWishlist(updatedWishlist);
      if (activeUser?.id === userId && updatedUsers[0]) {
        switchUser(updatedUsers[0].id);
      }
      showNotification('Profile deleted', 'success');
    } catch (err) {
      showNotification(`Supabase profile delete failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
    return;
  }

  setUsers(updatedUsers);
  setCredits(updatedCredits);
  setWishlist(updatedWishlist);
  await storage.set('cc_users', updatedUsers);
  await storage.set('cc_credits', updatedCredits);
  await storage.set('cc_wishlist', updatedWishlist);
  if (activeUser?.id === userId && updatedUsers[0]) {
    switchUser(updatedUsers[0].id);
  }
  showNotification('Local profile deleted', 'success');
};

export const saveHighScoreAction = async (
  context: Pick<BaseDataContext, 'activeUser' | 'currentUser' | 'setUsers' | 'users'>,
  score: number
) => {
  const { activeUser, currentUser, setUsers, users } = context;
  if (!activeUser) return;
  const currentHigh = activeUser.highScore || 0;
  if (score <= currentHigh) return;

  if (currentUser) {
    try {
      await updateSupabaseUser(activeUser.id, { highScore: score });
    } catch (err) {
      console.error('Supabase high score update failed', err);
    }
    return;
  }

  const updatedUsers = users.map((user) =>
    user.id === activeUser.id ? { ...user, highScore: score } : user
  );
  setUsers(updatedUsers);
  await storage.set('cc_users', updatedUsers);
};

export const updateRankingsAction = async (
  context: Pick<BaseDataContext, 'activeUser' | 'currentUser' | 'setUsers' | 'showNotification' | 'users'>,
  rankings: RankingList
) => {
  const { activeUser, currentUser, setUsers, showNotification, users } = context;
  if (!activeUser) return;

  if (currentUser) {
    try {
      await updateSupabaseUser(activeUser.id, { rankings });
      showNotification('Rankings saved!', 'success');
    } catch (err) {
      showNotification(`Supabase rankings update failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
    return;
  }

  const updatedUsers = users.map((user) =>
    user.id === activeUser.id ? { ...user, rankings } : user
  );
  setUsers(updatedUsers);
  await storage.set('cc_users', updatedUsers);
  showNotification('Local rankings saved!', 'success');
};

export const standardizeDatabaseAction = async (
  context: Pick<BaseDataContext, 'coasters' | 'currentUser' | 'setCoasters' | 'showNotification'>
) => {
  const { coasters, currentUser, setCoasters, showNotification } = context;
  const standardizedCoasters = coasters.map((coaster) => ({
    ...coaster,
    manufacturer: normalizeManufacturer(coaster.manufacturer),
    park: normalizeParkName(coaster.park),
    country: normalizeCountry(coaster.country),
  }));

  if (!currentUser) {
    setCoasters(standardizedCoasters);
    await storage.set('cc_coasters', standardizedCoasters.filter((coaster) => coaster.isCustom));
    showNotification('Local coaster database standardized.', 'success');
    return;
  }

  try {
    const customCoasters = standardizedCoasters.filter((coaster) => coaster.isCustom);
    await upsertCoasters(customCoasters);
    showNotification('Database standardized.', 'success');
  } catch (err) {
    showNotification(`Supabase standardize failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
  }
};

export const clearStoragePhotosAction = async (
  context: Pick<BaseDataContext, 'credits' | 'currentUser' | 'setCredits' | 'showNotification'>
) => {
  const { credits, currentUser, setCredits, showNotification } = context;
  if (
    window.confirm(
      'This will remove all uploaded photos from logs to free up space. Text data remains. Continue?'
    )
  ) {
    if (!currentUser) {
      const updatedCredits = credits.map((credit) => ({ ...credit, photoUrl: undefined, gallery: [] }));
      setCredits(updatedCredits);
      await storage.set('cc_credits', updatedCredits);
      showNotification('Local storage cleared.', 'success');
      return;
    }

    try {
      for (const credit of credits) {
        await updateSupabaseCredit(credit.id, { photoUrl: undefined, gallery: [] });
      }
      showNotification('Storage cleared.', 'success');
    } catch (err) {
      showNotification(`Supabase storage clear failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  }
};

export const importDataAction = async (
  context: Pick<
    BaseDataContext,
    | 'activeUser'
    | 'coasters'
    | 'credits'
    | 'currentUser'
    | 'generateId'
    | 'setCoasters'
    | 'setCredits'
    | 'setUsers'
    | 'setWishlist'
    | 'showNotification'
    | 'users'
    | 'wishlist'
  >,
  jsonData: any
) => {
  const {
    activeUser,
    coasters,
    credits,
    currentUser,
    generateId,
    setCoasters,
    setCredits,
    setUsers,
    setWishlist,
    showNotification,
    users,
    wishlist,
  } = context;

  try {
    if (!jsonData) {
      showNotification('No data provided for import.', 'error');
      return;
    }

    let rawData;
    try {
      rawData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    } catch (parseErr) {
      console.error('JSON Parse Error', parseErr);
      showNotification('Invalid JSON format. Please check your file.', 'error');
      return;
    }

    let data: any = {};
    if (Array.isArray(rawData)) {
      data = { credits: rawData };
    } else if (typeof rawData === 'object' && rawData !== null) {
      data = rawData;
    } else {
      showNotification('Unsupported data format. Expected JSON object or array.', 'error');
      return;
    }

    if (currentUser) {
      const uid = currentUser.uid;
      const usersToImport: User[] = (Array.isArray(data.users) ? data.users : [])
        .filter((u: any) => validId(u?.id) && typeof u?.name === 'string')
        .map((u: any) => ({
          id: u.id,
          ownerId: uid,
          name: u.name,
          avatarColor: u.avatarColor || 'bg-blue-500',
          avatarUrl: isAllowedUrl(u.avatarUrl) ? u.avatarUrl : undefined,
          rankings: trimRankings(u.rankings),
          highScore: Number.isFinite(Number(u.highScore)) ? Math.floor(Number(u.highScore)) : undefined,
        }));

      const coastersToImport: Coaster[] = (Array.isArray(data.coasters) ? data.coasters : [])
        .filter((c: any) => validId(c?.id) && c?.name && c?.park)
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          park: normalizeParkName(c.park),
          manufacturer: normalizeManufacturer(c.manufacturer || 'Unknown'),
          country: normalizeCountry(c.country || 'Unknown'),
          type: c.type || CoasterType.Steel,
          isCustom: true,
          imageUrl: isAllowedUrl(c.imageUrl) ? c.imageUrl : undefined,
          specs: c.specs,
          variants: c.variants,
          audioUrl: isAllowedUrl(c.audioUrl) ? c.audioUrl : undefined,
        }));

      const knownUserIds = new Set(usersToImport.map((u) => u.id).concat(users.map((u) => u.id)));
      const knownCoasterIds = new Set(coastersToImport.map((c) => c.id).concat(coasters.map((c) => c.id)));

      const creditsToImport: Credit[] = (Array.isArray(data.credits) ? data.credits : [])
        .filter((c: any) => validId(c?.id) && knownUserIds.has(c.userId) && knownCoasterIds.has(c.coasterId))
        .map((c: any) => ({
          id: c.id,
          ownerId: uid,
          userId: c.userId,
          coasterId: c.coasterId,
          date: c.date || new Date().toISOString(),
          rideCount: c.rideCount || 1,
          photoUrl: isAllowedUrl(c.photoUrl) ? c.photoUrl : undefined,
          gallery: sanitizeGallery(c.gallery),
          notes: c.notes,
          restraints: c.restraints,
          variant: c.variant,
        }));

      const wishlistToImport: WishlistEntry[] = (Array.isArray(data.wishlist) ? data.wishlist : [])
        .filter((w: any) => validId(w?.id) && knownUserIds.has(w.userId) && knownCoasterIds.has(w.coasterId))
        .map((w: any) => ({
          id: w.id,
          ownerId: uid,
          userId: w.userId,
          coasterId: w.coasterId,
          addedAt: w.addedAt || new Date().toISOString(),
          notes: w.notes,
        }));

      await upsertUsers(usersToImport);
      await upsertCoasters(coastersToImport);
      await upsertCredits(creditsToImport);
      await upsertWishlist(wishlistToImport);
      showNotification(
        `Import successful! Added ${usersToImport.length} users, ${coastersToImport.length} coasters, ${creditsToImport.length} credits, and ${wishlistToImport.length} wishlist items to your Supabase account.`,
        'success'
      );
      return;
    }

    const localUsers = [...users];
    const localCredits = [...credits];
    const localWishlist = [...wishlist];
    const localCoasters = [...coasters];

    let usersAdded = 0;
    let coastersAdded = 0;
    let creditsAdded = 0;
    let wishlistAdded = 0;

    const coasterIdMap: Record<string, string> = {};
    const userIdMap: Record<string, string> = {};

    if (data.users && Array.isArray(data.users)) {
      data.users.forEach((u: any) => {
        if (!u.name) return;
        const existing = localUsers.find((e) => e.name.toLowerCase() === u.name.toLowerCase());
        if (existing) {
          userIdMap[u.id] = existing.id;
        } else {
          let avatarUrl = u.avatarUrl;
          if (avatarUrl && avatarUrl.startsWith('data:image') && avatarUrl.length > 102400) {
            avatarUrl = undefined;
          }

          let newId = u.id || generateId('u');
          if (newId === 'u1') newId = `u_local_${generateId('u').substring(0, 4)}`;
          userIdMap[u.id || newId] = newId;

          localUsers.push({
            id: newId,
            ownerId: 'local',
            name: u.name,
            avatarColor: u.avatarColor || 'bg-blue-500',
            avatarUrl,
            rankings: trimRankings(u.rankings),
            highScore: u.highScore,
          });
          usersAdded++;
        }
      });
    }

    if (data.coasters && Array.isArray(data.coasters)) {
      data.coasters.forEach((c: any) => {
        if (!c.name || !c.park) return;
        const existing = localCoasters.find(
          (e) =>
            cleanName(e.name).toLowerCase() === cleanName(c.name).toLowerCase() &&
            cleanName(e.park).toLowerCase() === cleanName(c.park).toLowerCase()
        );
        if (existing) {
          coasterIdMap[c.id] = existing.id;
        } else {
          const newId = c.id || generateId('c');
          coasterIdMap[c.id || newId] = newId;
          localCoasters.push({
            id: newId,
            isCustom: true,
            name: c.name,
            park: normalizeParkName(c.park),
            manufacturer: normalizeManufacturer(c.manufacturer || 'Unknown'),
            country: normalizeCountry(c.country || 'Unknown'),
            type: c.type || CoasterType.Steel,
            imageUrl: c.imageUrl,
            specs: c.specs,
            variants: c.variants,
            audioUrl: c.audioUrl,
          });
          coastersAdded++;
        }
      });
    }

    if (data.credits && Array.isArray(data.credits)) {
      data.credits.forEach((c: any) => {
        if (!c.coasterId && !c.coasterName) return;
        const creditId = c.id || generateId('cr');
        if (!localCredits.some((existing) => existing.id === creditId)) {
          const newCoasterId = coasterIdMap[c.coasterId] || c.coasterId || 'unknown_coaster';
          const newUserId =
            userIdMap[c.userId] ||
            (localUsers.find((u) => u.id === c.userId) ? c.userId : activeUser?.id || localUsers[0]?.id);
          if (!newCoasterId || !newUserId) return;

          localCredits.push({
            id: creditId,
            coasterId: newCoasterId,
            userId: newUserId,
            ownerId: 'local',
            date: c.date || new Date().toISOString(),
            rideCount: c.rideCount || 1,
            photoUrl: c.photoUrl,
            gallery: c.gallery,
            notes: c.notes,
            restraints: c.restraints,
            variant: c.variant,
          });
          creditsAdded++;
        }
      });
    }

    if (data.wishlist && Array.isArray(data.wishlist)) {
      data.wishlist.forEach((w: any) => {
        if (!w.coasterId) return;
        const wishlistId = w.id || generateId('w');
        if (!localWishlist.some((existing) => existing.id === wishlistId)) {
          const newCoasterId = coasterIdMap[w.coasterId] || w.coasterId || 'unknown_coaster';
          const newUserId =
            userIdMap[w.userId] ||
            (localUsers.find((u) => u.id === w.userId) ? w.userId : activeUser?.id || localUsers[0]?.id);
          if (!newCoasterId || !newUserId) return;

          localWishlist.push({
            id: wishlistId,
            coasterId: newCoasterId,
            userId: newUserId,
            ownerId: 'local',
            addedAt: w.addedAt || new Date().toISOString(),
            notes: w.notes,
          });
          wishlistAdded++;
        }
      });
    }

    if (usersAdded > 0 || coastersAdded > 0 || creditsAdded > 0 || wishlistAdded > 0) {
      setUsers(localUsers);
      setCredits(localCredits);
      setWishlist(localWishlist);
      setCoasters(localCoasters);

      await storage.set('cc_users', localUsers);
      await storage.set('cc_credits', localCredits);
      await storage.set('cc_wishlist', localWishlist);
      await storage.set('cc_coasters', localCoasters.filter((coaster) => coaster.isCustom));

      showNotification(
        `Local import successful! Added ${usersAdded} users, ${coastersAdded} coasters, ${creditsAdded} credits, and ${wishlistAdded} wishlist items.`,
        'success'
      );
    } else {
      showNotification('No new local data found to import.', 'info');
    }
  } catch (err) {
    console.error('Import failed', err);
    showNotification(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
  }
};

export const exportDataAction = (
  context: Pick<BaseDataContext, 'coasters' | 'credits' | 'showNotification' | 'users' | 'wishlist'>
) => {
  const { coasters, credits, showNotification, users, wishlist } = context;
  try {
    const data = {
      users,
      credits,
      wishlist,
      coasters: coasters.filter((coaster) => coaster.isCustom),
      exportDate: new Date().toISOString(),
      version: '1.1.0',
    };

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `CoasterCount_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);

    showNotification('JSON Backup Exported Successfully', 'success');
  } catch (err) {
    console.error('Export failed', err);
    showNotification('Export failed. Please try again.', 'error');
  }
};

export const getLocalDataStatsAction = async () => {
  const localUsers = await storage.get<User[]>('cc_users');
  const localCoasters = await storage.get<Coaster[]>('cc_coasters');
  const localCredits = await storage.get<Credit[]>('cc_credits');
  const localWishlist = await storage.get<WishlistEntry[]>('cc_wishlist');
  return {
    users: localUsers?.length || 0,
    coasters: localCoasters?.length || 0,
    credits: localCredits?.length || 0,
    wishlist: localWishlist?.length || 0,
  };
};

export const forceMigrateLocalDataAction = async (
  context: Pick<
    BaseDataContext,
    'currentUser' | 'setIsSyncing' | 'showNotification' | 'manualRefresh'
  >
) => {
  const { currentUser, setIsSyncing, showNotification, manualRefresh } = context;
  if (!currentUser) {
    showNotification('You must be signed in to migrate data to the cloud.', 'error');
    return;
  }

  setIsSyncing(true);
  try {
    const stats = await getLocalDataStatsAction();
    if (stats.users === 0 && stats.coasters === 0 && stats.credits === 0 && stats.wishlist === 0) {
      showNotification('No local data found to migrate.', 'info');
      return;
    }

    const uid = currentUser.uid;
    const localUsers = await storage.get<User[]>('cc_users');
    const localCoasters = await storage.get<Coaster[]>('cc_coasters');
    const localCredits = await storage.get<Credit[]>('cc_credits');
    const localWishlist = await storage.get<WishlistEntry[]>('cc_wishlist');

    const useDefaultUsers = !localUsers || localUsers.length === 0;
    const usersToMigrate = useDefaultUsers
      ? ownerScopedDefaultUsers(uid)
      : localUsers.map((user) => ({ ...user, ownerId: uid }));
    const defaultUserIdMap = new Map<string, string>(
      useDefaultUsers
        ? INITIAL_USERS.map((user, index) => [user.id, usersToMigrate[index]?.id || user.id])
        : []
    );
    const coastersToMigrate = (localCoasters || [])
      .filter((coaster) => coaster.isCustom)
      .map((coaster) => ({ ...coaster, isCustom: true }));
    const creditsToMigrate = (localCredits || []).map((credit) => ({
      ...credit,
      ownerId: uid,
      userId: defaultUserIdMap.get(credit.userId) || credit.userId,
    }));
    const wishlistToMigrate = (localWishlist || []).map((entry) => ({
      ...entry,
      ownerId: uid,
      userId: defaultUserIdMap.get(entry.userId) || entry.userId,
    }));

    await upsertUsers(usersToMigrate);
    await upsertCoasters(coastersToMigrate);
    await upsertCredits(creditsToMigrate);
    await upsertWishlist(wishlistToMigrate);

    await storage.set('cc_users', null);
    await storage.set('cc_coasters', null);
    await storage.set('cc_credits', null);
    await storage.set('cc_wishlist', null);
    showNotification('Manual Supabase migration successful!', 'success');
    manualRefresh();
  } catch (err) {
    console.error('Manual migration failed', err);
    showNotification('Migration failed. Some data might be invalid.', 'error');
  } finally {
    setIsSyncing(false);
  }
};

export const repairDatabaseAction = async (
  context: Pick<
    BaseDataContext,
    'coasters' | 'credits' | 'currentUser' | 'setIsSyncing' | 'showNotification' | 'users' | 'wishlist' | 'manualRefresh'
  >
) => {
  const { coasters, credits, currentUser, manualRefresh, setIsSyncing, showNotification, users, wishlist } =
    context;
  if (!currentUser) return;
  setIsSyncing(true);
  showNotification('Repairing database links...', 'info');

  try {
    const uid = currentUser.uid;
    const fixedUsers = users.map((user) => ({ ...user, ownerId: uid }));
    const fixedCredits = credits.map((credit) => ({ ...credit, ownerId: uid }));
    const fixedWishlist = wishlist.map((entry) => ({ ...entry, ownerId: uid }));
    const customCoasters = coasters.filter((coaster) => coaster.isCustom);

    await upsertUsers(fixedUsers);
    await upsertCredits(fixedCredits);
    await upsertWishlist(fixedWishlist);
    await upsertCoasters(customCoasters);
    showNotification('Supabase ownership repair complete.', 'success');
    manualRefresh();
  } catch (err) {
    console.error('Repair failed', err);
    showNotification('Repair failed.', 'error');
  } finally {
    setIsSyncing(false);
  }
};

export const reconstructMissingProfilesAction = async (
  context: Pick<
    BaseDataContext,
    'credits' | 'currentUser' | 'setIsSyncing' | 'setUsers' | 'showNotification' | 'users'
  >
) => {
  const { credits, currentUser, setIsSyncing, setUsers, showNotification, users } = context;
  if (!currentUser) return;
  const isAdmin = currentUser.email === 'k.anaya.izquierdo@gmail.com';
  if (!isAdmin) return;

  setIsSyncing(true);
  showNotification('Reconstructing missing profiles...', 'info');

  try {
    const missingUserIds = new Set<string>();
    const existingUserIds = new Set(users.map((u) => u.id));

    credits.forEach((credit) => {
      if (!existingUserIds.has(credit.userId)) {
        missingUserIds.add(credit.userId);
      }
    });

    if (missingUserIds.size === 0) {
      showNotification('No missing profiles detected.', 'info');
      return;
    }

    const newUsersList: User[] = [];
    for (const id of Array.from(missingUserIds)) {
      const newUser: User = {
        id,
        name: `Recovered Profile (${id.length > 4 ? id.slice(-4) : id})`,
        ownerId: currentUser.uid,
        avatarColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][
          Math.floor(Math.random() * 6)
        ],
      };
      newUsersList.push(newUser);
    }

    if (newUsersList.length > 0) {
      await upsertUsers(newUsersList);
      setUsers((prev) => [...prev, ...newUsersList]);
      showNotification(`Successfully reconstructed ${newUsersList.length} profiles!`, 'success');
    } else {
      showNotification('All missing profiles already exist in the database.', 'info');
    }
  } catch (err) {
    console.error('Reconstruction failed', err);
    showNotification('Reconstruction failed.', 'error');
  } finally {
    setIsSyncing(false);
  }
};

export const nuclearResetAction = async (
  context: Pick<BaseDataContext, 'setIsSyncing' | 'showNotification'>
) => {
  const { setIsSyncing, showNotification } = context;
  if (
    window.confirm(
      'NUCLEAR OPTION: This will clear your local cache and force a complete re-sync from the cloud. No cloud data will be deleted. Continue?'
    )
  ) {
    setIsSyncing(true);
    try {
      localStorage.clear();
      await storage.set('cc_users', null);
      await storage.set('cc_coasters', null);
      await storage.set('cc_credits', null);
      await storage.set('cc_wishlist', null);
      window.location.reload();
    } catch {
      showNotification('Reset failed', 'error');
    }
  }
};

export const scanAllCreditsAction = async (
  context: Pick<
    BaseDataContext,
    'currentUser' | 'setCredits' | 'setIsSyncing' | 'setUsers' | 'showNotification'
  >
) => {
  const { currentUser, setCredits, setIsSyncing, setUsers, showNotification } = context;
  if (!currentUser) return;
  const isAdmin = currentUser.email === 'k.anaya.izquierdo@gmail.com';
  if (!isAdmin) {
    showNotification('Only admins can perform a global scan.', 'error');
    return;
  }

  setIsSyncing(true);
  showNotification('Performing deep global data scan...', 'info');

  try {
    // Client-side Supabase with RLS supports owner-scoped deep reload.
    const loaded = await loadOwnerData(currentUser.uid);
    const ownerUsers = loaded.users.length > 0 ? loaded.users : INITIAL_USERS;
    setCredits(loaded.credits);
    setUsers(ownerUsers);
    showNotification(
      `Supabase scan complete (owner scope). Found ${loaded.credits.length} credits across ${ownerUsers.length} profiles.`,
      'success'
    );
  } catch (err) {
    console.error('Global scan failed', err);
    showNotification('Global scan failed. Please try again.', 'error');
  } finally {
    setIsSyncing(false);
  }
};
