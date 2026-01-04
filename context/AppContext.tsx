
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Coaster, Credit, ViewState, WishlistEntry, RankingList } from '../types';
import { INITIAL_COASTERS, INITIAL_USERS, normalizeManufacturer, cleanName, normalizeParkName, normalizeCountry } from '../constants';
import { generateCoasterInfo, generateAppIcon, extractCoasterFromUrl } from '../services/geminiService';
import { fetchCoasterImageFromWiki } from '../services/wikipediaService';
import { storage } from '../services/storage';

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
  coasterToLog: Coaster | null;
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
  setCoasterToLog: (coaster: Coaster | null) => void;
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

// Helper: Compress Image to avoid storage limits (now using IndexedDB, but good for performance)
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // Optimization
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // 0.7 Quality
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeUserId, setActiveUserId] = useState<string>('u1');
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [coasters, setCoasters] = useState<Coaster[]>(INITIAL_COASTERS);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [wishlist, setWishlist] = useState<WishlistEntry[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [coasterListViewMode, setCoasterListViewMode] = useState<'CREDITS' | 'WISHLIST'>('CREDITS');
  const [notification, setNotification] = useState<Notification | null>(null);
  const [lastSearchQuery, setLastSearchQuery] = useState('');
  const [coasterToLog, setCoasterToLog] = useState<Coaster | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Animations
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);

  // Deep linking for analytics
  const [analyticsFilter, setAnalyticsFilter] = useState<{ mode: string, value: string } | null>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    const init = async () => {
        // 1. Try migrate from LocalStorage first (legacy support)
        await storage.migrateFromLocalStorage();

        // 2. Load from IndexedDB
        const loadedUsers = await storage.get<User[]>('cc_users');
        const loadedCoasters = await storage.get<Coaster[]>('cc_coasters');
        const loadedCredits = await storage.get<Credit[]>('cc_credits');
        const loadedWishlist = await storage.get<WishlistEntry[]>('cc_wishlist');
        const loadedActiveId = await storage.get<string>('cc_active_user_id');

        if (loadedUsers) setUsers(loadedUsers);
        if (loadedCoasters) setCoasters(loadedCoasters);
        if (loadedCredits) setCredits(loadedCredits);
        if (loadedWishlist) setWishlist(loadedWishlist);
        if (loadedActiveId) setActiveUserId(loadedActiveId);
        
        setIsInitialized(true);
    };
    init();
  }, []);

  // --- PERSISTENCE ---
  useEffect(() => {
      if (!isInitialized) return;
      storage.set('cc_users', users);
  }, [users, isInitialized]);

  useEffect(() => {
      if (!isInitialized) return;
      storage.set('cc_coasters', coasters);
  }, [coasters, isInitialized]);

  useEffect(() => {
      if (!isInitialized) return;
      storage.set('cc_credits', credits);
  }, [credits, isInitialized]);

  useEffect(() => {
      if (!isInitialized) return;
      storage.set('cc_wishlist', wishlist);
  }, [wishlist, isInitialized]);

  useEffect(() => {
      if (!isInitialized) return;
      storage.set('cc_active_user_id', activeUserId);
  }, [activeUserId, isInitialized]);

  const activeUser = users.find(u => u.id === activeUserId) || users[0];

  const switchUser = (userId: string) => {
    setActiveUserId(userId);
    changeView('DASHBOARD');
    showNotification(`Welcome back, ${users.find(u => u.id === userId)?.name}!`);
  };

  const addUser = async (name: string, photo?: File) => {
    let avatarUrl;
    if (photo) {
        avatarUrl = await compressImage(photo);
    }
    const newUser: User = {
      id: generateId('u'),
      name,
      avatarColor: 'bg-emerald-500',
      avatarUrl
    };
    setUsers([...users, newUser]);
    switchUser(newUser.id);
  };

  const updateUser = async (userId: string, newName: string, photo?: File) => {
      let avatarUrl;
      if (photo) {
          avatarUrl = await compressImage(photo);
      }
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, name: newName, ...(avatarUrl ? { avatarUrl } : {}) } : u));
      showNotification("Profile updated");
  };

  const updateRankings = (rankings: RankingList) => {
      setUsers(prev => prev.map(u => 
          u.id === activeUser.id 
            ? { ...u, rankings } 
            : u
      ));
      showNotification("Rankings saved!", "success");
  };

  const changeView = (view: ViewState) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const triggerConfetti = () => {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
  };

  const triggerFireworks = () => {
      setShowFireworks(true);
      setTimeout(() => setShowFireworks(false), 4000);
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setNotification({ id, message, type });
    setTimeout(() => {
      setNotification(prev => prev?.id === id ? null : prev);
    }, 3000);
  };

  const hideNotification = () => setNotification(null);

  const addCredit = async (coasterId: string, date: string, notes: string, restraints: string, photos: File[] = [], variant?: string) => {
    let photoUrl;
    let gallery: string[] = [];

    if (photos.length > 0) {
        // Process all photos
        const processed = await Promise.all(photos.map(p => compressImage(p)));
        // First one is main, others are gallery
        photoUrl = processed[0];
        if (processed.length > 1) {
            gallery = processed.slice(1);
        }
    }

    const newCredit: Credit = {
      id: generateId('cr'),
      userId: activeUser.id,
      coasterId,
      date,
      rideCount: 1, // Default to 1, logic can handle increment if exact same date/variant logic exists later
      notes,
      restraints,
      photoUrl,
      gallery,
      variant
    };
    
    setCredits(prev => [...prev, newCredit]);
    
    // Auto-remove from wishlist if present
    if (isInWishlist(coasterId)) {
        removeFromWishlist(coasterId);
    }

    return newCredit;
  };

  const updateCredit = async (creditId: string, date: string, notes: string, restraints: string, mainPhotoUrl: string | undefined, gallery: string[], newPhotos: File[] = [], variant?: string) => {
      let newGallery = [...gallery];
      
      // Process new uploads
      if (newPhotos && newPhotos.length > 0) {
          const processedNew = await Promise.all(newPhotos.map(p => compressImage(p)));
          
          // If we don't have a main photo yet, take the first new one
          if (!mainPhotoUrl && processedNew.length > 0) {
              mainPhotoUrl = processedNew[0];
              // Add rest to gallery
              if (processedNew.length > 1) {
                  newGallery = [...newGallery, ...processedNew.slice(1)];
              }
          } else {
              // Add all to gallery
              newGallery = [...newGallery, ...processedNew];
          }
      }

      setCredits(prev => prev.map(c => c.id === creditId ? {
          ...c,
          date,
          notes,
          restraints,
          photoUrl: mainPhotoUrl,
          gallery: newGallery,
          variant
      } : c));
      
      showNotification("Log updated successfully", "success");
  };

  const deleteCredit = (creditId: string) => {
    if (window.confirm("Are you sure you want to delete this ride log?")) {
        setCredits(prev => prev.filter(c => c.id !== creditId));
        showNotification("Ride log deleted", 'info');
    }
  };

  const addNewCoaster = async (coasterData: Omit<Coaster, 'id'>) => {
    // Check if duplicate exists (name + park)
    const exists = coasters.find(c => 
        cleanName(c.name).toLowerCase() === cleanName(coasterData.name).toLowerCase() && 
        cleanName(c.park).toLowerCase() === cleanName(coasterData.park).toLowerCase()
    );

    if (exists) {
        showNotification("Coaster already exists!", "error");
        return exists;
    }

    // Standardize before adding
    const newCoaster: Coaster = {
      ...coasterData,
      id: generateId('c'),
      manufacturer: normalizeManufacturer(coasterData.manufacturer),
      park: normalizeParkName(coasterData.park),
      country: normalizeCountry(coasterData.country), // Integrated normalizeCountry
      isCustom: true
    };
    
    setCoasters(prev => [...prev, newCoaster]);
    return newCoaster;
  };

  const editCoaster = (id: string, updates: Partial<Coaster>) => {
      setCoasters(prev => prev.map(c => {
          if (c.id !== id) return c;
          
          const updated = { ...c, ...updates };
          // Re-standardize relevant fields if they changed
          if (updates.manufacturer) updated.manufacturer = normalizeManufacturer(updates.manufacturer);
          if (updates.park) updated.park = normalizeParkName(updates.park);
          if (updates.country) updated.country = normalizeCountry(updates.country);
          return updated;
      }));
      showNotification("Coaster details updated", "success");
  };

  const addMultipleCoasters = async (newCoasters: Omit<Coaster, 'id'>[]) => {
      const toAdd: Coaster[] = [];
      newCoasters.forEach(c => {
          const exists = coasters.find(existing => 
             cleanName(existing.name).toLowerCase() === cleanName(c.name).toLowerCase() &&
             cleanName(existing.park).toLowerCase() === cleanName(c.park).toLowerCase()
          );
          if (!exists) {
              toAdd.push({
                  ...c,
                  id: generateId('c'),
                  manufacturer: normalizeManufacturer(c.manufacturer),
                  park: normalizeParkName(c.park),
                  country: normalizeCountry(c.country),
                  isCustom: true
              });
          }
      });
      
      if (toAdd.length > 0) {
          setCoasters(prev => [...prev, ...toAdd]);
          showNotification(`Imported ${toAdd.length} new coasters!`, 'success');
      }
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

  const addToWishlist = (coasterId: string) => {
      if (!isInWishlist(coasterId)) {
          const entry: WishlistEntry = {
              id: generateId('w'),
              userId: activeUser.id,
              coasterId,
              addedAt: new Date().toISOString()
          };
          setWishlist(prev => [...prev, entry]);
          showNotification("Added to Bucket List", "success");
      }
  };

  const removeFromWishlist = (coasterId: string) => {
      setWishlist(prev => prev.filter(w => !(w.userId === activeUser.id && w.coasterId === coasterId)));
      showNotification("Removed from Bucket List", "info");
  };

  const isInWishlist = (coasterId: string) => {
      return wishlist.some(w => w.userId === activeUser.id && w.coasterId === coasterId);
  };

  const enrichDatabaseImages = async () => {
      showNotification("Enriching database... this may take a moment.", 'info');
      let updatedCount = 0;
      
      // Clone array to modify
      const newCoasters = [...coasters];
      
      for (let i = 0; i < newCoasters.length; i++) {
          const c = newCoasters[i];
          // Only fetch if it's a generic placeholder OR missing
          if (!c.imageUrl || c.imageUrl.includes('picsum')) {
              const url = await fetchCoasterImageFromWiki(c.name, c.park);
              if (url) {
                  newCoasters[i] = { ...c, imageUrl: url };
                  updatedCount++;
              }
          }
      }

      if (updatedCount > 0) {
          setCoasters(newCoasters);
          showNotification(`Updated ${updatedCount} coasters with real photos!`, 'success');
      } else {
          showNotification("Database is already up to date.", 'info');
      }
  };

  const autoFetchCoasterImage = async (coasterId: string) => {
      const coaster = coasters.find(c => c.id === coasterId);
      if (!coaster) return null;
      const url = await fetchCoasterImageFromWiki(coaster.name, coaster.park);
      if (url) {
          // Update silently in background
          updateCoasterImage(coasterId, url);
      }
      return url;
  };

  const updateCoasterImage = (coasterId: string, imageUrl: string) => {
      setCoasters(prev => prev.map(c => c.id === coasterId ? { ...c, imageUrl } : c));
  };

  const standardizeDatabase = () => {
      setCoasters(prev => prev.map(c => ({
          ...c,
          manufacturer: normalizeManufacturer(c.manufacturer),
          park: normalizeParkName(c.park),
          country: normalizeCountry(c.country) // Apply country normalization
      })));
      showNotification("Database names, parks, and countries standardized.", 'success');
  };

  const clearStoragePhotos = async () => {
      if (window.confirm("This will remove all uploaded photos from logs to free up space. Text data remains. Continue?")) {
           setCredits(prev => prev.map(c => ({ ...c, photoUrl: undefined, gallery: [] })));
           showNotification("Storage cleared.", 'success');
      }
  };

  const importData = (jsonData: any) => {
      if (jsonData && Array.isArray(jsonData)) {
          // Assume coaster array import for now
          // Could be expanded to full backup import
          showNotification("Full backup import not yet implemented, imported structure must match DB.", "info");
      }
  };

  return (
    <AppContext.Provider value={{
      activeUser,
      users,
      coasters,
      credits,
      wishlist,
      currentView,
      changeView,
      switchUser,
      addUser,
      updateUser,
      addCredit,
      updateCredit,
      addNewCoaster,
      editCoaster,
      addMultipleCoasters,
      searchOnlineCoaster,
      extractFromUrl,
      generateIcon,
      coasterListViewMode,
      setCoasterListViewMode,
      deleteCredit,
      notification,
      showNotification,
      hideNotification,
      lastSearchQuery,
      setLastSearchQuery,
      coasterToLog,
      setCoasterToLog,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      enrichDatabaseImages,
      updateCoasterImage,
      autoFetchCoasterImage,
      importData,
      standardizeDatabase,
      clearStoragePhotos,
      showConfetti,
      triggerConfetti,
      showFireworks,
      triggerFireworks,
      updateRankings,
      analyticsFilter,
      setAnalyticsFilter
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
