import type { Dispatch, SetStateAction } from 'react';
import {
  cleanName,
  normalizeCountry,
  normalizeManufacturer,
  normalizeParkName,
} from '../constants';
import {
  db,
  deleteDoc,
  doc,
  handleFirestoreError,
  OperationType,
  setDoc,
  updateDoc,
  writeBatch,
  type FirebaseUser,
} from '../firebase';
import { generateAppIcon, generateCoasterInfo, extractCoasterFromUrl } from '../services/geminiService';
import { storage } from '../services/storage';
import { fetchCoasterImageFromWiki } from '../services/wikipediaService';
import type { Coaster, Credit, User, WishlistEntry } from '../types';

type NotificationType = 'success' | 'error' | 'info';
type ShowNotification = (message: string, type?: NotificationType) => void;
type GenerateId = (prefix: string) => string;
type CompressImage = (file: File) => Promise<string>;

interface DomainContext {
  currentUser: FirebaseUser | null;
  activeUser: User | null;
  coasters: Coaster[];
  credits: Credit[];
  wishlist: WishlistEntry[];
  setCredits: Dispatch<SetStateAction<Credit[]>>;
  setWishlist: Dispatch<SetStateAction<WishlistEntry[]>>;
  showNotification: ShowNotification;
  generateId: GenerateId;
  compressImage: CompressImage;
}

export const isInWishlistForUser = (
  activeUser: User | null,
  wishlist: WishlistEntry[],
  coasterId: string
) => {
  if (!activeUser) return false;
  return wishlist.some((entry) => entry.userId === activeUser.id && entry.coasterId === coasterId);
};

export const addCreditAction = async (
  context: DomainContext,
  coasterId: string,
  date: string,
  notes: string,
  restraints: string,
  photos: File[] = [],
  variant?: string
) => {
  const {
    activeUser,
    compressImage,
    credits,
    currentUser,
    generateId,
    setCredits,
    showNotification,
    wishlist,
    setWishlist,
  } = context;

  if (!activeUser) {
    showNotification('Please select a profile to log credits', 'error');
    return;
  }

  let photoUrl;
  let gallery: string[] = [];

  if (photos.length > 0) {
    const processed = await Promise.all(photos.map((photo) => compressImage(photo)));
    photoUrl = processed[0];
    if (processed.length > 1) {
      gallery = processed.slice(1);
    }
  }

  const newCredit: Credit = {
    id: generateId('cr'),
    userId: activeUser.id,
    ownerId: currentUser?.uid || 'local',
    coasterId,
    date,
    rideCount: 1,
    notes,
    restraints,
    photoUrl,
    gallery,
    variant,
  };

  if (currentUser) {
    try {
      await setDoc(doc(db, 'credits', newCredit.id), newCredit);
      await removeFromWishlistAction(
        { ...context, credits, wishlist, setWishlist },
        coasterId,
        false
      );
      return newCredit;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `credits/${newCredit.id}`);
    }
  } else {
    const updatedCredits = [...credits, newCredit];
    setCredits(updatedCredits);
    await storage.set('cc_credits', updatedCredits);
    await removeFromWishlistAction(
      { ...context, credits: updatedCredits, wishlist, setWishlist },
      coasterId,
      false
    );
    showNotification('Credit logged locally!');
    return newCredit;
  }
};

export const updateCreditAction = async (
  context: DomainContext,
  creditId: string,
  date: string,
  notes: string,
  restraints: string,
  mainPhotoUrl: string | undefined,
  gallery: string[],
  newPhotos: File[] = [],
  variant?: string
) => {
  const { compressImage, credits, currentUser, setCredits, showNotification } = context;
  let newGallery = [...gallery];

  if (newPhotos && newPhotos.length > 0) {
    const processedNew = await Promise.all(newPhotos.map((photo) => compressImage(photo)));
    if (!mainPhotoUrl && processedNew.length > 0) {
      mainPhotoUrl = processedNew[0];
      if (processedNew.length > 1) {
        newGallery = [...newGallery, ...processedNew.slice(1)];
      }
    } else {
      newGallery = [...newGallery, ...processedNew];
    }
  }

  if (currentUser) {
    try {
      await updateDoc(doc(db, 'credits', creditId), {
        date,
        notes,
        restraints,
        photoUrl: mainPhotoUrl,
        gallery: newGallery,
        variant,
      });
      showNotification('Log updated successfully', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `credits/${creditId}`);
    }
  } else {
    const updatedCredits = credits.map((credit) =>
      credit.id === creditId
        ? {
            ...credit,
            date,
            notes,
            restraints,
            photoUrl: mainPhotoUrl,
            gallery: newGallery,
            variant,
          }
        : credit
    );
    setCredits(updatedCredits);
    await storage.set('cc_credits', updatedCredits);
    showNotification('Local log updated successfully', 'success');
  }
};

export const deleteCreditAction = async (context: DomainContext, creditId: string) => {
  const { credits, currentUser, setCredits, showNotification } = context;
  if (currentUser) {
    try {
      await deleteDoc(doc(db, 'credits', creditId));
      showNotification('Ride log deleted', 'info');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `credits/${creditId}`);
    }
  } else {
    const updatedCredits = credits.filter((credit) => credit.id !== creditId);
    setCredits(updatedCredits);
    await storage.set('cc_credits', updatedCredits);
    showNotification('Local ride log deleted', 'info');
  }
};

export const addNewCoasterAction = async (
  context: Pick<DomainContext, 'coasters' | 'generateId' | 'showNotification'>,
  coasterData: Omit<Coaster, 'id'>
) => {
  const { coasters, generateId, showNotification } = context;
  const exists = coasters.find(
    (coaster) =>
      cleanName(coaster.name).toLowerCase() === cleanName(coasterData.name).toLowerCase() &&
      cleanName(coaster.park).toLowerCase() === cleanName(coasterData.park).toLowerCase()
  );

  if (exists) {
    showNotification('Coaster already exists!', 'error');
    return exists;
  }

  const newCoaster: Coaster = {
    ...coasterData,
    id: generateId('c'),
    manufacturer: normalizeManufacturer(coasterData.manufacturer),
    park: normalizeParkName(coasterData.park),
    country: normalizeCountry(coasterData.country),
    isCustom: true,
  };

  try {
    await setDoc(doc(db, 'coasters', newCoaster.id), newCoaster);
    return newCoaster;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `coasters/${newCoaster.id}`);
    return newCoaster;
  }
};

export const editCoasterAction = async (
  context: Pick<DomainContext, 'coasters' | 'showNotification'>,
  id: string,
  updates: Partial<Coaster>
) => {
  const { coasters, showNotification } = context;
  const coaster = coasters.find((item) => item.id === id);
  if (!coaster) return;

  const updated = { ...coaster, ...updates };
  if (updates.manufacturer) updated.manufacturer = normalizeManufacturer(updates.manufacturer);
  if (updates.park) updated.park = normalizeParkName(updates.park);
  if (updates.country) updated.country = normalizeCountry(updates.country);

  try {
    await updateDoc(doc(db, 'coasters', id), updated);
    showNotification('Coaster details updated', 'success');
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `coasters/${id}`);
  }
};

export const addMultipleCoastersAction = async (
  context: Pick<DomainContext, 'coasters' | 'generateId' | 'showNotification'>,
  newCoasters: Omit<Coaster, 'id'>[]
) => {
  const { coasters, generateId, showNotification } = context;
  const batch = writeBatch(db);
  let count = 0;

  newCoasters.forEach((coaster) => {
    const exists = coasters.find(
      (existing) =>
        cleanName(existing.name).toLowerCase() === cleanName(coaster.name).toLowerCase() &&
        cleanName(existing.park).toLowerCase() === cleanName(coaster.park).toLowerCase()
    );
    if (!exists) {
      const id = generateId('c');
      const newCoaster = {
        ...coaster,
        id,
        manufacturer: normalizeManufacturer(coaster.manufacturer),
        park: normalizeParkName(coaster.park),
        country: normalizeCountry(coaster.country),
        isCustom: true,
      };
      batch.set(doc(db, 'coasters', id), newCoaster);
      count++;
    }
  });

  if (count > 0) {
    try {
      await batch.commit();
      showNotification(`Imported ${count} new coasters!`, 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'coasters (batch)');
    }
  }
};

export const addToWishlistAction = async (context: DomainContext, coasterId: string) => {
  const { activeUser, currentUser, generateId, setWishlist, showNotification, wishlist } = context;
  if (!activeUser) {
    showNotification('Please select a profile to add to wishlist', 'error');
    return;
  }

  if (!isInWishlistForUser(activeUser, wishlist, coasterId)) {
    const entry: WishlistEntry = {
      id: generateId('w'),
      userId: activeUser.id,
      ownerId: currentUser?.uid || 'local',
      coasterId,
      addedAt: new Date().toISOString(),
    };

    if (currentUser) {
      try {
        await setDoc(doc(db, 'wishlist', entry.id), entry);
        showNotification('Added to Bucket List', 'success');
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `wishlist/${entry.id}`);
      }
    } else {
      const updatedWishlist = [...wishlist, entry];
      setWishlist(updatedWishlist);
      await storage.set('cc_wishlist', updatedWishlist);
      showNotification('Added to local Bucket List', 'success');
    }
  }
};

export const removeFromWishlistAction = async (
  context: DomainContext,
  coasterId: string,
  notify = true
) => {
  const { activeUser, currentUser, setWishlist, showNotification, wishlist } = context;
  if (!activeUser) return;
  const entry = wishlist.find(
    (wishlistEntry) => wishlistEntry.userId === activeUser.id && wishlistEntry.coasterId === coasterId
  );

  if (entry) {
    if (currentUser) {
      try {
        await deleteDoc(doc(db, 'wishlist', entry.id));
        if (notify) showNotification('Removed from Bucket List', 'info');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `wishlist/${entry.id}`);
      }
    } else {
      const updatedWishlist = wishlist.filter((wishlistEntry) => wishlistEntry.id !== entry.id);
      setWishlist(updatedWishlist);
      await storage.set('cc_wishlist', updatedWishlist);
      if (notify) showNotification('Removed from local Bucket List', 'info');
    }
  }
};

export const updateCoasterImageAction = async (coasterId: string, imageUrl: string) => {
  try {
    await updateDoc(doc(db, 'coasters', coasterId), { imageUrl });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `coasters/${coasterId}`);
  }
};

export const autoFetchCoasterImageAction = async (
  coasters: Coaster[],
  coasterId: string
) => {
  const coaster = coasters.find((item) => item.id === coasterId);
  if (!coaster) return null;
  const url = await fetchCoasterImageFromWiki(coaster.name, coaster.park);
  if (url) {
    await updateCoasterImageAction(coasterId, url);
  }
  return url;
};

export const enrichDatabaseImagesAction = async (
  context: Pick<DomainContext, 'coasters' | 'showNotification'>,
  editCoaster: (id: string, updates: Partial<Coaster>) => Promise<void>
) => {
  const { coasters, showNotification } = context;
  showNotification('Enriching database... this may take a moment.', 'info');
  let updatedCount = 0;

  for (let i = 0; i < coasters.length; i++) {
    const coaster = coasters[i];
    if (!coaster.imageUrl || coaster.imageUrl.includes('picsum')) {
      const url = await fetchCoasterImageFromWiki(coaster.name, coaster.park);
      if (url) {
        await editCoaster(coaster.id, { imageUrl: url });
        updatedCount++;
      }
    }
  }

  if (updatedCount > 0) {
    showNotification(`Updated ${updatedCount} coasters with real photos!`, 'success');
  } else {
    showNotification('Database is already up to date.', 'info');
  }
};

export const searchOnlineCoasterAction = async (query: string) => generateCoasterInfo(query);
export const extractFromUrlAction = async (url: string) => extractCoasterFromUrl(url);
export const generateIconAction = async (prompt: string) => generateAppIcon(prompt);
