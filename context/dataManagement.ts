import type { Dispatch, SetStateAction } from 'react';
import { CoasterType, type Coaster, type Credit, type RankingList, type User, type WishlistEntry } from '../types';
import { INITIAL_USERS, cleanName, normalizeCountry, normalizeManufacturer, normalizeParkName } from '../constants';
import {
  collection,
  db,
  doc,
  getDoc,
  handleFirestoreError,
  OperationType,
  setDoc,
  updateDoc,
  writeBatch,
  type FirebaseUser,
  cleanForFirestore,
} from '../firebase';
import { storage } from '../services/storage';

type NotificationType = 'success' | 'error' | 'info';
type ShowNotification = (message: string, type?: NotificationType) => void;
type GenerateId = (prefix: string) => string;
type CompressImage = (file: File) => Promise<string>;

interface BaseDataContext {
  currentUser: FirebaseUser | null;
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
      await setDoc(doc(db, 'users', newUser.id), cleanForFirestore(newUser));
      switchUser(newUser.id);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${newUser.id}`);
    }
  } else {
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    await storage.set('cc_users', updatedUsers);
    switchUser(newUser.id);
    showNotification('Local profile created!');
  }
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
      await updateDoc(doc(db, 'users', userId), {
        name: newName,
        ...(avatarUrl ? { avatarUrl } : {}),
      });
      showNotification('Profile updated');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  } else {
    const updatedUsers = users.map((user) =>
      user.id === userId ? { ...user, name: newName, ...(avatarUrl ? { avatarUrl } : {}) } : user
    );
    setUsers(updatedUsers);
    await storage.set('cc_users', updatedUsers);
    showNotification('Local profile updated');
  }
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
      await updateDoc(doc(db, 'users', activeUser.id), { highScore: score });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${activeUser.id}`);
    }
  } else {
    const updatedUsers = users.map((user) =>
      user.id === activeUser.id ? { ...user, highScore: score } : user
    );
    setUsers(updatedUsers);
    await storage.set('cc_users', updatedUsers);
  }
};

export const updateRankingsAction = async (
  context: Pick<BaseDataContext, 'activeUser' | 'currentUser' | 'setUsers' | 'showNotification' | 'users'>,
  rankings: RankingList
) => {
  const { activeUser, currentUser, setUsers, showNotification, users } = context;
  if (!activeUser) return;
  if (currentUser) {
    try {
      await updateDoc(doc(db, 'users', activeUser.id), { rankings });
      showNotification('Rankings saved!', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${activeUser.id}`);
    }
  } else {
    const updatedUsers = users.map((user) =>
      user.id === activeUser.id ? { ...user, rankings } : user
    );
    setUsers(updatedUsers);
    await storage.set('cc_users', updatedUsers);
    showNotification('Local rankings saved!', 'success');
  }
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
    await storage.set(
      'cc_coasters',
      standardizedCoasters.filter((coaster) => coaster.isCustom)
    );
    showNotification('Local coaster database standardized.', 'success');
    return;
  }

  const batch = writeBatch(db);
  let count = 0;
  standardizedCoasters.forEach((coaster) => {
    if (coaster.isCustom) {
      batch.update(doc(db, 'coasters', coaster.id), {
        manufacturer: coaster.manufacturer,
        park: coaster.park,
        country: coaster.country,
      });
      count++;
    }
  });

  if (count > 0) {
    try {
      await batch.commit();
      showNotification('Database standardized.', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'coasters (standardize batch)');
    }
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
      const updatedCredits = credits.map((credit) => ({ ...credit, photoUrl: null, gallery: [] }));
      setCredits(updatedCredits);
      await storage.set('cc_credits', updatedCredits);
      showNotification('Local storage cleared.', 'success');
      return;
    }

    const batch = writeBatch(db);
    credits.forEach((credit) => {
      batch.update(doc(db, 'credits', credit.id), { photoUrl: null, gallery: [] });
    });
    try {
      await batch.commit();
      showNotification('Storage cleared.', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'credits (clear photos batch)');
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
      const coasterIdMap: Record<string, string> = {};
      const userIdMap: Record<string, string> = {};

      let coastersAdded = 0;
      let usersAdded = 0;
      let creditsAdded = 0;
      let wishlistAdded = 0;

      let batch = writeBatch(db);
      let batchCount = 0;
      const commitBatchIfNeeded = async (force = false) => {
        if (batchCount >= 450 || (force && batchCount > 0)) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      };

      if (data.users && Array.isArray(data.users)) {
        for (const u of data.users) {
          if (!u.name) continue;
          const existing = users.find((e) => e.name.toLowerCase() === u.name.toLowerCase());

          if (existing) {
            userIdMap[u.id] = existing.id;
          } else {
            let newId = u.id || generateId('u');
            if (newId === 'u1') newId = `u_${uid.substring(0, 8)}`;
            userIdMap[u.id || newId] = newId;

            let avatarUrl = u.avatarUrl;
            if (avatarUrl && avatarUrl.startsWith('data:image') && avatarUrl.length > 102400) {
              console.warn(
                `Avatar for user ${u.name} is too large (${avatarUrl.length} bytes), skipping to prevent document size errors.`
              );
              avatarUrl = undefined;
            }

            const newUser = cleanImportedData({
              id: newId,
              ownerId: uid,
              name: u.name,
              avatarColor: u.avatarColor || 'bg-blue-500',
              avatarUrl,
              rankings: trimRankings(u.rankings),
              highScore: u.highScore,
            });

            batch.set(doc(db, 'users', newId), cleanForFirestore(newUser));
            batchCount++;
            usersAdded++;
            await commitBatchIfNeeded();
          }
        }
      }

      if (data.coasters && Array.isArray(data.coasters)) {
        for (const c of data.coasters) {
          if (!c.name || !c.park) continue;
          const existing = coasters.find(
            (e) =>
              cleanName(e.name).toLowerCase() === cleanName(c.name).toLowerCase() &&
              cleanName(e.park).toLowerCase() === cleanName(c.park).toLowerCase()
          );

          if (existing) {
            coasterIdMap[c.id] = existing.id;
          } else {
            const newId = c.id || generateId('c');
            coasterIdMap[c.id || newId] = newId;
            const newCoaster = cleanImportedData({
              id: newId,
              name: c.name,
              park: normalizeParkName(c.park),
              manufacturer: normalizeManufacturer(c.manufacturer || 'Unknown'),
              country: normalizeCountry(c.country || 'Unknown'),
              type: c.type || CoasterType.Steel,
              isCustom: true,
              imageUrl: c.imageUrl,
              specs: c.specs,
              variants: c.variants,
              audioUrl: c.audioUrl,
            });

            batch.set(doc(db, 'coasters', newId), cleanForFirestore(newCoaster));
            batchCount++;
            coastersAdded++;
            await commitBatchIfNeeded();
          }
        }
      }

      if (data.credits && Array.isArray(data.credits)) {
        for (const c of data.credits) {
          if (!c.coasterId && !c.coasterName) continue;
          const creditId = c.id || generateId('cr');
          const alreadyExists = credits.find((existing) => existing.id === creditId);

          if (!alreadyExists) {
            const newCoasterId = coasterIdMap[c.coasterId] || c.coasterId || 'unknown_coaster';
            const newUserId =
              userIdMap[c.userId] ||
              (users.find((u) => u.id === c.userId) ? c.userId : activeUser?.id || users[0]?.id);
            if (!newCoasterId || !newUserId) continue;

            const newCredit = cleanImportedData({
              id: creditId,
              coasterId: newCoasterId,
              userId: newUserId,
              ownerId: uid,
              date: c.date || new Date().toISOString(),
              rideCount: c.rideCount || 1,
              photoUrl: c.photoUrl,
              gallery: c.gallery,
              notes: c.notes,
              restraints: c.restraints,
              variant: c.variant,
            });

            batch.set(doc(db, 'credits', creditId), cleanForFirestore(newCredit));
            batchCount++;
            creditsAdded++;
            await commitBatchIfNeeded();
          }
        }
      }

      if (data.wishlist && Array.isArray(data.wishlist)) {
        for (const w of data.wishlist) {
          if (!w.coasterId) continue;
          const wishlistId = w.id || generateId('w');
          const alreadyExists = wishlist.find((existing) => existing.id === wishlistId);

          if (!alreadyExists) {
            const newCoasterId = coasterIdMap[w.coasterId] || w.coasterId || 'unknown_coaster';
            const newUserId =
              userIdMap[w.userId] ||
              (users.find((u) => u.id === w.userId) ? w.userId : activeUser?.id || users[0]?.id);
            if (!newCoasterId || !newUserId) continue;

            const newWishlist = cleanImportedData({
              id: wishlistId,
              coasterId: newCoasterId,
              userId: newUserId,
              ownerId: uid,
              addedAt: w.addedAt || new Date().toISOString(),
              notes: w.notes,
            });

            batch.set(doc(db, 'wishlist', wishlistId), cleanForFirestore(newWishlist));
            batchCount++;
            wishlistAdded++;
            await commitBatchIfNeeded();
          }
        }
      }

      await commitBatchIfNeeded(true);
      if (coastersAdded > 0 || usersAdded > 0 || creditsAdded > 0 || wishlistAdded > 0) {
        showNotification(
          `Import successful! Added ${usersAdded} users, ${coastersAdded} coasters, ${creditsAdded} credits, and ${wishlistAdded} wishlist items to your cloud account.`,
          'success'
        );
      } else {
        showNotification('No new data found to import.', 'info');
      }
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

    const batch = writeBatch(db);
    const usersToMigrate = localUsers || INITIAL_USERS;
    const { getDoc: loadDoc, doc: makeDoc } = await import('firebase/firestore');

    for (const user of usersToMigrate) {
      const userRef = makeDoc(db, 'users', user.id);
      const userSnap = await loadDoc(userRef);
      if (!userSnap.exists() || userSnap.data()?.ownerId === uid) {
        batch.set(userRef, cleanForFirestore({ ...user, ownerId: uid }));
      } else {
        console.warn(`Skipping migration of user ${user.id} as it is owned by another account.`);
      }
    }

    if (localCoasters) {
      for (const coaster of localCoasters) {
        if (!coaster.isCustom) continue;
        const coasterRef = makeDoc(db, 'coasters', coaster.id);
        const coasterSnap = await loadDoc(coasterRef);
        if (!coasterSnap.exists()) {
          batch.set(coasterRef, cleanForFirestore(coaster));
        }
      }
    }

    if (localCredits) {
      for (const credit of localCredits) {
        const creditRef = makeDoc(db, 'credits', credit.id);
        const creditSnap = await loadDoc(creditRef);
        if (!creditSnap.exists() || creditSnap.data()?.ownerId === uid) {
          batch.set(creditRef, cleanForFirestore({ ...credit, ownerId: uid }));
        }
      }
    }

    if (localWishlist) {
      for (const wishlistEntry of localWishlist) {
        const wishlistRef = makeDoc(db, 'wishlist', wishlistEntry.id);
        const wishlistSnap = await loadDoc(wishlistRef);
        if (!wishlistSnap.exists() || wishlistSnap.data()?.ownerId === uid) {
          batch.set(wishlistRef, cleanForFirestore({ ...wishlistEntry, ownerId: uid }));
        }
      }
    }

    await batch.commit();
    await storage.set('cc_users', null);
    await storage.set('cc_coasters', null);
    await storage.set('cc_credits', null);
    await storage.set('cc_wishlist', null);
    showNotification('Manual migration successful!', 'success');
    manualRefresh();
  } catch (err) {
    console.error('Manual migration failed', err);
    showNotification('Migration failed. Some data might be already owned by another account.', 'error');
  } finally {
    setIsSyncing(false);
  }
};

export const repairDatabaseAction = async (
  context: Pick<BaseDataContext, 'currentUser' | 'setIsSyncing' | 'showNotification' | 'users' | 'manualRefresh'>
) => {
  const { currentUser, manualRefresh, setIsSyncing, showNotification, users } = context;
  if (!currentUser) return;
  setIsSyncing(true);
  showNotification('Repairing database links...', 'info');

  try {
    const uid = currentUser.uid;
    const batch = writeBatch(db);
    let repairedCount = 0;
    const userProfileIds = new Set(users.map((u) => u.id));
    const { getDocs, query, where } = await import('firebase/firestore');

    for (const profileId of userProfileIds) {
      const q = query(collection(db, 'credits'), where('userId', '==', profileId));
      const snap = await getDocs(q);
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.ownerId !== uid) {
          batch.update(docSnap.ref, { ownerId: uid });
          repairedCount++;
        }
      });
    }

    if (repairedCount > 0) {
      await batch.commit();
      showNotification(`Repaired ${repairedCount} data links!`, 'success');
      manualRefresh();
    } else {
      showNotification('No repairable data found.', 'info');
    }
  } catch (err) {
    console.error('Repair failed', err);
    showNotification('Repair failed. Try the Global Scan.', 'error');
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
    const batch = writeBatch(db);
    for (const id of Array.from(missingUserIds)) {
      const userRef = doc(db, 'users', id);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        const newUser: User = {
          id,
          name: `Recovered Profile (${id.length > 4 ? id.slice(-4) : id})`,
          ownerId: currentUser.uid,
          avatarColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][
            Math.floor(Math.random() * 6)
          ],
        };
        newUsersList.push(newUser);
        batch.set(userRef, cleanForFirestore(newUser));
      }
    }

    if (newUsersList.length > 0) {
      await batch.commit();
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
    } catch (err) {
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
    const { getDocs, collection: loadCollection } = await import('firebase/firestore');
    const allCreditsSnapshot = await getDocs(loadCollection(db, 'credits'));
    const allCredits = allCreditsSnapshot.docs.map((docSnap) => ({ ...docSnap.data(), id: docSnap.id } as Credit));

    const allUsersSnapshot = await getDocs(loadCollection(db, 'users'));
    const allUsers = allUsersSnapshot.docs.map((docSnap) => ({ ...docSnap.data(), id: docSnap.id } as User));

    const legacyData: any = {};
    const possibleKeys = [
      'users',
      'credits',
      'wishlist',
      'coasters',
      'active_user_id',
      'cc_users',
      'cc_credits',
      'cc_wishlist',
      'cc_coasters',
      'cc_active_user_id',
      'coaster_data',
      'my_credits',
      'ride_log',
    ];

    possibleKeys.forEach((key) => {
      const val = localStorage.getItem(key);
      if (val) {
        try {
          legacyData[key] = JSON.parse(val);
        } catch {
          legacyData[key] = val;
        }
      }
    });

    if (Object.keys(legacyData).length > 0) {
      console.log('Found Legacy LocalStorage Data:', legacyData);
    }

    const existingUserIds = new Set(allUsers.map((u) => u.id));
    const orphanedCredits = allCredits.filter((credit) => !existingUserIds.has(credit.userId));

    console.log(`Scan Results:
      - Total Credits: ${allCredits.length}
      - Total Users: ${allUsers.length}
      - Orphaned Credits: ${orphanedCredits.length}
      - Legacy Local Keys: ${Object.keys(legacyData).join(', ')}
    `);

    setCredits(allCredits);
    setUsers(allUsers.length > 0 ? allUsers : INITIAL_USERS);

    if (orphanedCredits.length > 0) {
      showNotification(
        `Scan complete. Found ${allCredits.length} credits, including ${orphanedCredits.length} orphaned ones!`,
        'success'
      );
    } else {
      showNotification(`Scan complete. Found ${allCredits.length} total credits.`, 'success');
    }
  } catch (err) {
    console.error('Global scan failed', err);
    showNotification('Global scan failed. Check console for details.', 'error');
  } finally {
    setIsSyncing(false);
  }
};
