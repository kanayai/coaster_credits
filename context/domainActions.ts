import type { Dispatch, SetStateAction } from 'react';
import {
  cleanName,
  normalizeCountry,
  normalizeManufacturer,
  normalizeParkName,
} from '../constants';
import type { AppAuthUser } from '../services/authTypes';
import {
  deleteById,
  updateCoaster,
  updateCredit,
  upsertCoasters,
  upsertCredits,
  upsertWishlist,
} from '../services/supabaseData';
import { generateAppIcon, generateCoasterInfo, extractCoasterFromUrl } from '../services/geminiService';
import { storage } from '../services/storage';
import { fetchCoasterImageFromWiki } from '../services/wikipediaService';
import type { Coaster, Credit, User, WishlistEntry } from '../types';

type NotificationType = 'success' | 'error' | 'info';
type ShowNotification = (message: string, type?: NotificationType) => void;
type GenerateId = (prefix: string) => string;
type CompressImage = (file: File) => Promise<string>;

interface DomainContext {
  currentUser: AppAuthUser | null;
  activeUser: User | null;
  coasters: Coaster[];
  credits: Credit[];
  wishlist: WishlistEntry[];
  setCoasters: Dispatch<SetStateAction<Coaster[]>>;
  setCredits: Dispatch<SetStateAction<Credit[]>>;
  setWishlist: Dispatch<SetStateAction<WishlistEntry[]>>;
  showNotification: ShowNotification;
  generateId: GenerateId;
  compressImage: CompressImage;
}

const persistCustomCoasters = async (coasters: Coaster[]) => {
  await storage.set(
    'cc_coasters',
    coasters.filter((coaster) => coaster.isCustom)
  );
};

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
      await upsertCredits([newCredit]);
      setCredits((prev) => [...prev, newCredit]);
      await removeFromWishlistAction(
        { ...context, credits: [...credits, newCredit], wishlist, setWishlist },
        coasterId,
        false
      );
      showNotification('Credit logged successfully!', 'success');
      return newCredit;
    } catch (err) {
      showNotification(`Failed to save credit in Supabase: ${err instanceof Error ? err.message : String(err)}`, 'error');
      return;
    }
  }

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
      await updateCredit(creditId, {
        date,
        notes,
        restraints,
        photoUrl: mainPhotoUrl,
        gallery: newGallery,
        variant,
      });
      setCredits((prev) =>
        prev.map((credit) =>
          credit.id === creditId
            ? { ...credit, date, notes, restraints, photoUrl: mainPhotoUrl, gallery: newGallery, variant }
            : credit
        )
      );
      showNotification('Log updated successfully', 'success');
    } catch (err) {
      showNotification(`Failed to update Supabase log: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
    return;
  }

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
};

export const deleteCreditAction = async (context: DomainContext, creditId: string) => {
  const { credits, currentUser, setCredits, showNotification } = context;
  if (currentUser) {
    try {
      await deleteById('credits', creditId);
      setCredits((prev) => prev.filter((credit) => credit.id !== creditId));
      showNotification('Ride log deleted', 'info');
    } catch (err) {
      showNotification(`Failed to delete Supabase log: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
    return;
  }

  const updatedCredits = credits.filter((credit) => credit.id !== creditId);
  setCredits(updatedCredits);
  await storage.set('cc_credits', updatedCredits);
  showNotification('Local ride log deleted', 'info');
};

export const addNewCoasterAction = async (
  context: Pick<
    DomainContext,
    'coasters' | 'currentUser' | 'generateId' | 'setCoasters' | 'showNotification'
  >,
  coasterData: Omit<Coaster, 'id'>
) => {
  const { coasters, currentUser, generateId, setCoasters, showNotification } = context;
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

  if (currentUser) {
    try {
      await upsertCoasters([newCoaster]);
      setCoasters((prev) => [...prev, newCoaster]);
      showNotification('Custom coaster saved!', 'success');
      return newCoaster;
    } catch (err) {
      showNotification(`Failed to save Supabase coaster: ${err instanceof Error ? err.message : String(err)}`, 'error');
      return newCoaster;
    }
  }

  const updatedCoasters = [...coasters, newCoaster];
  setCoasters(updatedCoasters);
  await persistCustomCoasters(updatedCoasters);
  showNotification('Custom coaster saved locally!', 'success');
  return newCoaster;
};

export const editCoasterAction = async (
  context: Pick<DomainContext, 'coasters' | 'currentUser' | 'setCoasters' | 'showNotification'>,
  id: string,
  updates: Partial<Coaster>
) => {
  const { coasters, currentUser, setCoasters, showNotification } = context;
  const coaster = coasters.find((item) => item.id === id);
  if (!coaster) return;

  const updated = { ...coaster, ...updates };
  if (updates.manufacturer) updated.manufacturer = normalizeManufacturer(updates.manufacturer);
  if (updates.park) updated.park = normalizeParkName(updates.park);
  if (updates.country) updated.country = normalizeCountry(updates.country);

  if (currentUser) {
    try {
      await updateCoaster(id, updated);
      setCoasters((prev) => prev.map((item) => (item.id === id ? updated : item)));
      showNotification('Coaster details updated', 'success');
    } catch (err) {
      showNotification(`Failed to update Supabase coaster: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
    return;
  }

  const updatedCoasters = coasters.map((item) => (item.id === id ? updated : item));
  setCoasters(updatedCoasters);
  await persistCustomCoasters(updatedCoasters);
  showNotification('Local coaster details updated', 'success');
};

export const addMultipleCoastersAction = async (
  context: Pick<
    DomainContext,
    'coasters' | 'currentUser' | 'generateId' | 'setCoasters' | 'showNotification'
  >,
  newCoasters: Omit<Coaster, 'id'>[]
) => {
  const { coasters, currentUser, generateId, setCoasters, showNotification } = context;
  const createdCoasters: Coaster[] = [];

  newCoasters.forEach((coaster) => {
    const exists = coasters.find(
      (existing) =>
        cleanName(existing.name).toLowerCase() === cleanName(coaster.name).toLowerCase() &&
        cleanName(existing.park).toLowerCase() === cleanName(coaster.park).toLowerCase()
    );
    if (!exists) {
      createdCoasters.push({
        ...coaster,
        id: generateId('c'),
        manufacturer: normalizeManufacturer(coaster.manufacturer),
        park: normalizeParkName(coaster.park),
        country: normalizeCountry(coaster.country),
        isCustom: true,
      });
    }
  });

  if (createdCoasters.length === 0) return;

  if (!currentUser) {
    const updatedCoasters = [...coasters, ...createdCoasters];
    setCoasters(updatedCoasters);
    await persistCustomCoasters(updatedCoasters);
    showNotification(`Imported ${createdCoasters.length} new coasters locally!`, 'success');
    return;
  }

  try {
    await upsertCoasters(createdCoasters);
    setCoasters((prev) => [...prev, ...createdCoasters]);
    showNotification(`Imported ${createdCoasters.length} new coasters!`, 'success');
  } catch (err) {
    showNotification(`Failed to import to Supabase: ${err instanceof Error ? err.message : String(err)}`, 'error');
  }
};

export const addToWishlistAction = async (context: DomainContext, coasterId: string) => {
  const { activeUser, currentUser, generateId, setWishlist, showNotification, wishlist } = context;
  if (!activeUser) {
    showNotification('Please select a profile to add to wishlist', 'error');
    return;
  }

  if (!isInWishlistForUser(activeUser, wishlist, coasterId)) {
    const newEntry: WishlistEntry = {
      id: generateId('w'),
      userId: activeUser.id,
      ownerId: currentUser?.uid || 'local',
      coasterId,
      addedAt: new Date().toISOString(),
    };

    if (currentUser) {
      try {
        await upsertWishlist([newEntry]);
        setWishlist((prev) => [...prev, newEntry]);
        showNotification('Added to Bucket List', 'success');
      } catch (err) {
        showNotification(`Failed to add Supabase wishlist entry: ${err instanceof Error ? err.message : String(err)}`, 'error');
      }
      return;
    }

    const updatedWishlist = [...wishlist, newEntry];
    setWishlist(updatedWishlist);
    await storage.set('cc_wishlist', updatedWishlist);
    showNotification('Added to local Bucket List', 'success');
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

  if (!entry) return;

  if (currentUser) {
    try {
      await deleteById('wishlist', entry.id);
      setWishlist((prev) => prev.filter((wishlistEntry) => wishlistEntry.id !== entry.id));
      if (notify) showNotification('Removed from Bucket List', 'info');
    } catch (err) {
      showNotification(`Failed to remove Supabase wishlist entry: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
    return;
  }

  const updatedWishlist = wishlist.filter((wishlistEntry) => wishlistEntry.id !== entry.id);
  setWishlist(updatedWishlist);
  await storage.set('cc_wishlist', updatedWishlist);
  if (notify) showNotification('Removed from local Bucket List', 'info');
};

export const updateCoasterImageAction = async (
  context: Pick<DomainContext, 'coasters' | 'currentUser' | 'setCoasters'>,
  coasterId: string,
  imageUrl: string
) => {
  const { coasters, currentUser, setCoasters } = context;
  if (currentUser) {
    try {
      await updateCoaster(coasterId, { imageUrl });
      setCoasters((prev) =>
        prev.map((coaster) => (coaster.id === coasterId ? { ...coaster, imageUrl } : coaster))
      );
    } catch (err) {
      console.error('Supabase coaster image update failed', err);
    }
    return;
  }

  const updatedCoasters = coasters.map((coaster) =>
    coaster.id === coasterId ? { ...coaster, imageUrl } : coaster
  );
  setCoasters(updatedCoasters);
  await persistCustomCoasters(updatedCoasters);
};

export const autoFetchCoasterImageAction = async (
  context: Pick<DomainContext, 'coasters' | 'currentUser' | 'setCoasters'>,
  coasterId: string
) => {
  const { coasters } = context;
  const coaster = coasters.find((item) => item.id === coasterId);
  if (!coaster) return null;
  const url = await fetchCoasterImageFromWiki(coaster.name, coaster.park);
  if (url) {
    await updateCoasterImageAction(context, coasterId, url);
  }
  return url;
};

export const fetchWebPhotoForCreditAction = async (
  context: Pick<
    DomainContext,
    'coasters' | 'credits' | 'currentUser' | 'setCoasters' | 'setCredits' | 'showNotification'
  >,
  creditId: string,
  coasterId: string
) => {
  const { coasters, credits, currentUser, setCredits, showNotification } = context;
  const coaster = coasters.find((item) => item.id === coasterId);
  if (!coaster) {
    showNotification('Coaster not found for this log entry.', 'error');
    return null;
  }

  const url = await fetchCoasterImageFromWiki(coaster.name, coaster.park);
  if (!url) {
    showNotification('No web photo found for this coaster right now.', 'info');
    return null;
  }

  await updateCoasterImageAction(context, coasterId, url);

  const credit = credits.find((item) => item.id === creditId);
  if (!credit) {
    showNotification('Fetched a web photo for this entry.', 'success');
    return url;
  }

  if (currentUser) {
    try {
      await updateCredit(creditId, { photoUrl: url });
    } catch (err) {
      showNotification(`Failed to update Supabase log photo: ${err instanceof Error ? err.message : String(err)}`, 'error');
      return url;
    }
    setCredits((prev) =>
      prev.map((item) => (item.id === creditId ? { ...item, photoUrl: url } : item))
    );
    showNotification('Fetched a web photo for this entry.', 'success');
    return url;
  }

  const updatedCredits = credits.map((item) =>
    item.id === creditId ? { ...item, photoUrl: url } : item
  );
  setCredits(updatedCredits);
  await storage.set('cc_credits', updatedCredits);
  showNotification('Fetched a web photo for this entry.', 'success');
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
