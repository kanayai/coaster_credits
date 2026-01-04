
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Coaster, Credit, ViewState, WishlistEntry, RankingList } from '../types';
import { INITIAL_COASTERS, INITIAL_USERS, normalizeManufacturer, cleanName, normalizeParkName } from '../constants';
import { generateCoasterInfo, generateAppIcon, extractCoasterFromUrl } from '../services/geminiService';
import { fetchCoasterImageFromWiki } from '../services/wikipediaService';
import { storage } from '../services/storage';
import { Loader2 } from 'lucide-react';

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  activeUser: User;
  users: User[];
  coasters: Coaster[];
  credits: Credit[];
  wishlist: WishlistEntry[];
  currentView: ViewState;
  coasterListViewMode: 'CREDITS' | 'WISHLIST';
  notification: Notification | null;
  lastSearchQuery: string;
  coasterToLog: Coaster | null; // New state for deep linking to log
  showConfetti: boolean;
  showFireworks: boolean;
  
  // Analytics Deep Linking
  analyticsFilter: { mode: string, value: string } | null;
  setAnalyticsFilter: (filter: { mode: string, value: string } | null) => void;
  
  // Actions
  switchUser: (userId: string) => void;
  addUser: (name: string, photo?: File) => void;
  updateUser: (userId: string, newName: string, photo?: File) => void;
  addCredit: (coasterId: string, date: string, notes: string, restraints: string, photos?: File[], variant?: string) => Promise<Credit | undefined>;
  updateCredit: (creditId: string, date: string, notes: string, restraints: string, mainPhotoUrl: string | undefined, gallery: string[], newPhotos?: File[], variant?: string) => Promise<void>;
  addNewCoaster: (coaster: Omit<Coaster, 'id'>) => Promise<Coaster>;
  editCoaster: (id: string, updates: Partial<Coaster>) => void;
  addMultipleCoasters: (coasters: Omit<Coaster, 'id'>[]) => Promise<void>;
  searchOnlineCoaster: (query: string) => Promise<Partial<Coaster>[] | null>;
  extractFromUrl: (url: string) => Promise<Partial<Coaster> | null>;
  generateIcon: (prompt: string) => Promise<string | null>;
  changeView: (view: ViewState) => void;
  setCoasterListViewMode: (mode: 'CREDITS' | 'WISHLIST') => void;
  deleteCredit: (creditId: string) => void;
  setLastSearchQuery: (query: string) => void;
  setCoasterToLog: (coaster: Coaster | null) => void; // Setter for deep linking
  addToWishlist: (coasterId: string) => void;
  removeFromWishlist: (coasterId: string) => void;
  isInWishlist: (coasterId: string) => boolean;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideNotification: () => void;
  enrichDatabaseImages: () => Promise<void>;
  updateCoasterImage: (coasterId: string, imageUrl: string) => void;
  autoFetchCoasterImage: (coasterId: string) => Promise<string | null>;
  importData: (jsonData: any) => void;
  standardizeDatabase: () => void;
  triggerConfetti: () => void;
  triggerFireworks: () => void;
  
  // Ranking Actions
  updateRankings: (rankings: RankingList) => void;
  
  // Storage Actions
  clearStoragePhotos: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const generateId = (prefix: string) => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substr(2, 9);
  return `${prefix}_${timestamp}_${randomPart}`;
};

// Helper: Compress Image to avoid LocalStorage Quota Exceeded
// Updated: Even more aggressive compression for better storage management
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600; // Reduced from 800
        const MAX_HEIGHT = 600; // Reduced from 800
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress to JPEG with 0.6 quality (Reduced from 0.7)
            resolve(canvas.toDataURL('image/jpeg', 0.6));
        } else {
            reject(new Error("Canvas context failed"));
        }
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize with defaults, will be populated by useEffect
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [activeUser, setActiveUser] = useState<User>(INITIAL_USERS[0]);
  const [coasters, setCoasters] = useState<Coaster[]>(INITIAL_COASTERS);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [wishlist, setWishlist] = useState<WishlistEntry[]>([]);

  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [coasterListViewMode, setCoasterListViewMode] = useState<'CREDITS' | 'WISHLIST'>('CREDITS');
  const [notification, setNotification] = useState<Notification | null>(null);
  const [lastSearchQuery, setLastSearchQuery] = useState('');
  const [coasterToLog, setCoasterToLog] = useState<Coaster | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);
  
  const [analyticsFilter, setAnalyticsFilter] = useState<{ mode: string, value: string } | null>(null);

  // Load data from IndexedDB on mount
  useEffect(() => {
    const initializeApp = async () => {
        try {
            // Attempt migration first
            await storage.migrateFromLocalStorage();

            // Load data
            const [storedUsers, storedCoasters, storedCredits, storedWishlist, storedActiveUserId] = await Promise.all([
                storage.get<User[]>('cc_users'),
                storage.get<Coaster[]>('cc_coasters'),
                storage.get<Credit[]>('cc_credits'),
                storage.get<WishlistEntry[]>('cc_wishlist'),
                storage.get<string>('cc_active_user_id')
            ]);

            if (storedUsers) setUsers(storedUsers);
            if (storedCoasters) setCoasters(storedCoasters);
            if (storedCredits) setCredits(storedCredits);
            if (storedWishlist) setWishlist(storedWishlist);

            if (storedUsers && storedActiveUserId) {
                const foundUser = storedUsers.find(u => u.id === storedActiveUserId);
                if (foundUser) setActiveUser(foundUser);
            }
        } catch (e) {
            console.error("Initialization failed", e);
            showNotification("Failed to load data.", "error");
        } finally {
            setIsLoading(false);
        }
    };
    initializeApp();
  }, []);

  // Save Effects - persist to IndexedDB whenever state changes
  useEffect(() => {
    if (!isLoading) storage.set('cc_users', users).catch(() => showNotification("Save Failed: Storage Full?", "error"));
  }, [users, isLoading]);

  useEffect(() => {
    if (!isLoading) storage.set('cc_coasters', coasters).catch(() => showNotification("Save Failed: Storage Full?", "error"));
  }, [coasters, isLoading]);

  useEffect(() => {
    if (!isLoading) storage.set('cc_credits', credits).catch(() => showNotification("Save Failed: Storage Full?", "error"));
  }, [credits, isLoading]);

  useEffect(() => {
    if (!isLoading) storage.set('cc_wishlist', wishlist).catch(() => showNotification("Save Failed: Storage Full?", "error"));
  }, [wishlist, isLoading]);

  useEffect(() => {
    if (!isLoading) storage.set('cc_active_user_id', activeUser.id);
  }, [activeUser, isLoading]);


  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ id: generateId('notif'), message, type });
    setTimeout(() => {
        setNotification(prev => (prev && prev.message === message ? null : prev));
    }, 4000);
  };

  const hideNotification = () => setNotification(null);

  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const triggerFireworks = () => {
    setShowFireworks(true);
    setTimeout(() => setShowFireworks(false), 5000);
  };

  const switchUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
        setActiveUser(user);
        showNotification(`Welcome back, ${user.name}!`);
    }
  };

  const addUser = async (name: string, photo?: File) => {
    let avatarUrl: string | undefined;
    
    if (photo) {
        try {
            avatarUrl = await compressImage(photo);
        } catch (e) {
            console.error("Image compression error", e);
            showNotification("Failed to process photo", "error");
            return;
        }
    }

    const newUser: User = {
      id: generateId('u'),
      name,
      avatarColor: ['bg-red-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'][Math.floor(Math.random() * 6)],
      avatarUrl,
      rankings: { overall: [], steel: [], wooden: [], elements: {} }
    };
    setUsers(prev => [...prev, newUser]);
    setActiveUser(newUser);
    showNotification(`Profile "${name}" created!`, 'success');
  };

  const updateUser = async (userId: string, newName: string, photo?: File) => {
    let avatarUrl: string | undefined;
    
    if (photo) {
        try {
            avatarUrl = await compressImage(photo);
        } catch (e) {
             console.error("Image compression error", e);
             showNotification("Failed to process photo", "error");
             return;
        }
    }

    setUsers(prevUsers => prevUsers.map(u => 
      u.id === userId ? { ...u, name: newName, ...(avatarUrl ? { avatarUrl } : {}) } : u
    ));
    if (activeUser.id === userId) {
      setActiveUser(prev => ({ ...prev, name: newName, ...(avatarUrl ? { avatarUrl } : {}) }));
    }
    showNotification("Profile updated", 'success');
  };

  const updateRankings = (rankings: RankingList) => {
    setUsers(prev => prev.map(u => u.id === activeUser.id ? { ...u, rankings } : u));
    setActiveUser(prev => ({ ...prev, rankings }));
    showNotification("Rankings updated!", 'success');
  };

  const addToWishlist = (coasterId: string) => {
    if (isInWishlist(coasterId)) {
        showNotification("Already in bucket list", 'info');
        return;
    }
    const entry: WishlistEntry = {
      id: generateId('w'),
      userId: activeUser.id,
      coasterId,
      addedAt: new Date().toISOString()
    };
    setWishlist(prev => [...prev, entry]);
    showNotification("Added to Bucket List", 'success');
  };

  const removeFromWishlist = (coasterId: string) => {
    setWishlist(prev => prev.filter(w => !(w.userId === activeUser.id && w.coasterId === coasterId)));
    showNotification("Removed from Bucket List", 'info');
  };

  const isInWishlist = (coasterId: string) => {
    return wishlist.some(w => w.userId === activeUser.id && w.coasterId === coasterId);
  };

  const addCredit = async (coasterId: string, date: string, notes: string, restraints: string, photos?: File[], variant?: string): Promise<Credit | undefined> => {
    if (isInWishlist(coasterId)) {
      setWishlist(prev => prev.filter(w => !(w.userId === activeUser.id && w.coasterId === coasterId)));
    }

    let photoUrl: string | undefined;
    let gallery: string[] = [];

    if (photos && photos.length > 0) {
        try {
            // Compress all photos
            const compressedPhotos = await Promise.all(photos.map(p => compressImage(p)));
            // First one is main, rest are gallery
            photoUrl = compressedPhotos[0];
            gallery = compressedPhotos.slice(1);
        } catch (e) {
            console.error("Image compression error", e);
            showNotification("Failed to process photos", "error");
            return undefined;
        }
    }

    const newCredit: Credit = {
      id: generateId('cr'),
      userId: activeUser.id,
      coasterId,
      date,
      rideCount: 1, 
      notes,
      restraints,
      photoUrl,
      gallery,
      variant
    };
    setCredits(prev => [...prev, newCredit]);
    showNotification(photos && photos.length > 1 ? "Ride & Gallery Logged!" : "Ride Logged Successfully!", 'success');
    return newCredit;
  };

  const updateCredit = async (creditId: string, date: string, notes: string, restraints: string, mainPhotoUrl: string | undefined, gallery: string[], newPhotos?: File[], variant?: string) => {
    let newCompressedPhotos: string[] = [];
    
    if (newPhotos && newPhotos.length > 0) {
        try {
            newCompressedPhotos = await Promise.all(newPhotos.map(p => compressImage(p)));
        } catch (e) {
             console.error("Image compression error", e);
             showNotification("Failed to process new photos", "error");
             return;
        }
    }

    // Combine existing gallery with new photos
    const updatedGallery = [...gallery, ...newCompressedPhotos];
    
    // If no main photo but we have gallery images, promote the first one
    let finalMainPhoto = mainPhotoUrl;
    let finalGallery = updatedGallery;

    if (!finalMainPhoto && finalGallery.length > 0) {
        finalMainPhoto = finalGallery[0];
        finalGallery = finalGallery.slice(1);
    }

    setCredits(prev => prev.map(c => {
      if (c.id === creditId) {
        return {
          ...c,
          date,
          notes,
          restraints,
          photoUrl: finalMainPhoto,
          gallery: finalGallery,
          variant
        };
      }
      return c;
    }));
    showNotification("Entry updated successfully", 'success');
  };

  const addNewCoaster = async (coasterData: Omit<Coaster, 'id'>): Promise<Coaster> => {
    const newId = generateId('c');
    let finalImageUrl = coasterData.imageUrl;
    if (!finalImageUrl || finalImageUrl.includes('picsum')) {
       const wikiImage = await fetchCoasterImageFromWiki(coasterData.name, coasterData.park);
       if (wikiImage) finalImageUrl = wikiImage;
    }

    const newCoaster: Coaster = { 
        ...coasterData, 
        park: normalizeParkName(coasterData.park),
        country: cleanName(coasterData.country),
        manufacturer: normalizeManufacturer(coasterData.manufacturer),
        id: newId, 
        imageUrl: finalImageUrl 
    };
    setCoasters(prev => [...prev, newCoaster]);
    showNotification("Added to Database", 'success');
    return newCoaster;
  };

  const editCoaster = (id: string, updates: Partial<Coaster>) => {
    const cleanedUpdates: Partial<Coaster> = { ...updates };
    
    // Apply normalization if these fields are present in updates
    if (updates.park) cleanedUpdates.park = normalizeParkName(updates.park);
    if (updates.country) cleanedUpdates.country = cleanName(updates.country);
    if (updates.manufacturer) cleanedUpdates.manufacturer = normalizeManufacturer(updates.manufacturer);
    if (updates.name) cleanedUpdates.name = cleanName(updates.name);

    setCoasters(prev => prev.map(c => c.id === id ? { ...c, ...cleanedUpdates } : c));
    showNotification("Coaster details updated", 'success');
  };

  const addMultipleCoasters = async (coasterItems: Omit<Coaster, 'id'>[]) => {
      const newCoasters: Coaster[] = [];
      for (const item of coasterItems) {
          const newId = generateId('c');
          // Standardize basic fields
          const newCoaster: Coaster = {
              ...item,
              id: newId,
              park: normalizeParkName(item.park),
              country: cleanName(item.country || 'Unknown'),
              manufacturer: normalizeManufacturer(item.manufacturer || 'Unknown'),
          };
          newCoasters.push(newCoaster);
      }
      
      setCoasters(prev => [...prev, ...newCoasters]);
      showNotification(`Added ${newCoasters.length} coasters!`, 'success');
  };

  const searchOnlineCoaster = async (query: string) => {
    return await generateCoasterInfo(query);
  };

  const extractFromUrl = async (url: string) => {
      return await extractCoasterFromUrl(url);
  };

  const generateIcon = async (prompt: string) => {
    return await generateAppIcon(prompt);
  };

  const deleteCredit = (creditId: string) => {
    setCredits(prev => prev.filter(c => c.id !== creditId));
    showNotification("Credit deleted", 'info');
  }

  const changeView = (view: ViewState) => setCurrentView(view);

  const updateCoasterImage = (coasterId: string, imageUrl: string) => {
     setCoasters(prev => prev.map(c => c.id === coasterId ? { ...c, imageUrl } : c));
  };

  const autoFetchCoasterImage = async (coasterId: string): Promise<string | null> => {
      const coaster = coasters.find(c => c.id === coasterId);
      if (!coaster) return null;
      const imageUrl = await fetchCoasterImageFromWiki(coaster.name, coaster.park);
      if (imageUrl) {
          updateCoasterImage(coasterId, imageUrl);
          return imageUrl;
      }
      return null;
  };

  const enrichDatabaseImages = async () => {
      showNotification("Searching Wikipedia for photos...", 'info');
      const targets = coasters.filter(c => !c.imageUrl || c.imageUrl.includes('picsum'));
      let updatedCount = 0;
      const BATCH_SIZE = 5;
      for (let i = 0; i < targets.length; i += BATCH_SIZE) {
          const batch = targets.slice(i, i + BATCH_SIZE);
          const results = await Promise.all(
              batch.map(async (coaster) => {
                  const url = await fetchCoasterImageFromWiki(coaster.name, coaster.park);
                  return { id: coaster.id, url };
              })
          );
          setCoasters(prev => {
              let nextState = [...prev];
              results.forEach(res => {
                  if (res.url) {
                      const idx = nextState.findIndex(c => c.id === res.id);
                      if (idx !== -1) {
                          nextState[idx] = { ...nextState[idx], imageUrl: res.url };
                          updatedCount++;
                      }
                  }
              });
              return nextState;
          });
          await new Promise(r => setTimeout(r, 100));
      }
      if (updatedCount > 0) {
          showNotification(`Updated ${updatedCount} coasters with real photos!`, 'success');
      } else {
          showNotification(targets.length === 0 ? "Database already up to date." : "No new photos found.", 'info');
      }
  };

  const importData = (jsonData: any) => {
      try {
          const idTranslationTable: Record<string, string> = {}; 
          let mergedCoasterCount = 0;
          let addedCoasterCount = 0;
          let addedCreditCount = 0;

          if (jsonData.coasters && Array.isArray(jsonData.coasters)) {
              setCoasters(prev => {
                  const nextCoasters = [...prev];
                  jsonData.coasters.forEach((newC: Coaster) => {
                      const normName = cleanName(newC.name).toLowerCase();
                      const normPark = normalizeParkName(newC.park).toLowerCase();
                      const existing = nextCoasters.find(c => 
                        c.id === newC.id || (cleanName(c.name).toLowerCase() === normName && normalizeParkName(c.park).toLowerCase() === normPark)
                      );
                      if (existing) {
                        idTranslationTable[newC.id] = existing.id;
                        mergedCoasterCount++;
                      } else {
                        const newId = generateId('c');
                        idTranslationTable[newC.id] = newId;
                        nextCoasters.push({ ...newC, id: newId });
                        addedCoasterCount++;
                      }
                  });
                  return nextCoasters;
              });
          }

          if (jsonData.credits && Array.isArray(jsonData.credits)) {
              setCredits(prev => {
                  const existingIds = new Set(prev.map(c => c.id));
                  const toAdd = jsonData.credits
                    .filter((c: Credit) => !existingIds.has(c.id))
                    .map((c: Credit) => ({ ...c, userId: activeUser.id, coasterId: idTranslationTable[c.coasterId] || c.coasterId }));
                  addedCreditCount = toAdd.length;
                  return [...prev, ...toAdd];
              });
          }
          showNotification(`Import success! Added ${addedCreditCount} rides.`, 'success');
      } catch (e) {
          showNotification("Failed to import.", 'error');
      }
  };

  const standardizeDatabase = () => {
    let changesCount = 0;
    const normalizedCoasters = coasters.map(c => {
        const newName = cleanName(c.name);
        const newPark = normalizeParkName(c.park);
        const newMan = normalizeManufacturer(c.manufacturer);
        
        if (newName !== c.name || newPark !== c.park || newMan !== c.manufacturer) {
            changesCount++;
        }

        return {
            ...c,
            name: newName,
            park: newPark,
            manufacturer: newMan
        };
    });

    const uniqueMap = new Map<string, string>();
    const idTranslationTable: Record<string, string> = {};
    const deduplicatedCoasters: Coaster[] = [];
    let mergedCount = 0;

    normalizedCoasters.forEach(c => {
        const key = `${c.name.toLowerCase()}|${c.park.toLowerCase()}`;
        if (uniqueMap.has(key)) {
            idTranslationTable[c.id] = uniqueMap.get(key)!;
            mergedCount++;
        } else {
            uniqueMap.set(key, c.id);
            deduplicatedCoasters.push(c);
        }
    });

    if (mergedCount > 0 || changesCount > 0) {
        if (mergedCount > 0) {
             setCredits(prev => prev.map(cr => idTranslationTable[cr.coasterId] ? { ...cr, coasterId: idTranslationTable[cr.coasterId] } : cr));
             setWishlist(prev => prev.map(w => idTranslationTable[w.coasterId] ? { ...w, coasterId: idTranslationTable[w.coasterId] } : w));
             // Also need to update rankings
             setUsers(prev => prev.map(u => {
                 if (!u.rankings) return u;
                 const updateList = (list: string[]) => {
                     // Replace IDs, remove duplicates if merged into existing rank
                     const newIds = list.map(id => idTranslationTable[id] || id);
                     return [...new Set(newIds)];
                 };
                 const newRankings: RankingList = {
                     ...u.rankings,
                     overall: updateList(u.rankings.overall || []),
                     steel: updateList(u.rankings.steel || []),
                     wooden: updateList(u.rankings.wooden || []),
                     elements: u.rankings.elements ? Object.fromEntries(
                         Object.entries(u.rankings.elements).map(([k, v]) => [k, updateList(v as string[])])
                     ) : undefined
                 };
                 return { ...u, rankings: newRankings };
             }));
             // Update active user state
             if (activeUser.rankings) {
                 const u = users.find(u => u.id === activeUser.id);
                 if (u && u.rankings) {
                    const updateList = (list: string[]) => [...new Set(list.map(id => idTranslationTable[id] || id))];
                    const newRankings = {
                         ...activeUser.rankings,
                         overall: updateList(activeUser.rankings.overall || []),
                         steel: updateList(activeUser.rankings.steel || []),
                         wooden: updateList(activeUser.rankings.wooden || []),
                         elements: activeUser.rankings.elements ? Object.fromEntries(
                             Object.entries(activeUser.rankings.elements).map(([k, v]) => [k, updateList(v as string[])])
                         ) : undefined
                    };
                    setActiveUser(prev => ({ ...prev, rankings: newRankings }));
                 }
             }
        }
        
        setCoasters(deduplicatedCoasters);
        
        if (mergedCount > 0) {
            showNotification(`Standardized: Merged ${mergedCount} duplicates.`, 'success');
        } else {
            showNotification(`Standardized ${changesCount} coaster details.`, 'success');
        }
    } else {
        showNotification("Database is already clean.", 'info');
    }
  };
  
  const clearStoragePhotos = async () => {
      // Emergency feature to clear photos from Credits without deleting the credit
      if (!window.confirm("WARNING: This will delete ALL ride photos to free up space. Text logs will remain. Continue?")) return;
      
      setCredits(prev => prev.map(c => ({ ...c, photoUrl: undefined, gallery: [] })));
      setUsers(prev => prev.map(u => ({ ...u, avatarUrl: undefined })));
      setActiveUser(prev => ({ ...prev, avatarUrl: undefined }));
      
      showNotification("All photos wiped. Space reclaimed.", 'success');
  };

  return (
    <AppContext.Provider value={{
      activeUser, users, coasters, credits, wishlist, currentView, coasterListViewMode, notification, lastSearchQuery, coasterToLog, showConfetti, showFireworks,
      analyticsFilter, setAnalyticsFilter,
      switchUser, addUser, updateUser, addCredit, updateCredit, addNewCoaster, editCoaster, addMultipleCoasters, searchOnlineCoaster, extractFromUrl, generateIcon,
      changeView, setCoasterListViewMode, deleteCredit, addToWishlist, removeFromWishlist, isInWishlist, triggerConfetti, triggerFireworks,
      showNotification, hideNotification, setLastSearchQuery, setCoasterToLog, enrichDatabaseImages, updateCoasterImage, autoFetchCoasterImage,
      importData, standardizeDatabase, updateRankings, clearStoragePhotos
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};
