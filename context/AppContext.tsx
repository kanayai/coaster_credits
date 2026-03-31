
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Coaster, Credit, ViewState, WishlistEntry, RankingList, CoasterType } from '../types';
import { INITIAL_COASTERS, INITIAL_USERS, normalizeManufacturer, cleanName, normalizeParkName, normalizeCountry } from '../constants';
import { generateCoasterInfo, generateAppIcon, extractCoasterFromUrl } from '../services/geminiService';
import { fetchCoasterImageFromWiki } from '../services/wikipediaService';
import { storage } from '../services/storage';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  setDoc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  writeBatch,
  OperationType,
  handleFirestoreError,
  FirebaseUser
} from '../firebase';

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export type AppTheme = 'sky' | 'emerald' | 'violet' | 'rose' | 'amber';

interface AppContextType {
  // Auth
  currentUser: FirebaseUser | null;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthLoading: boolean;
  isSyncing: boolean;

  activeUser: User | null;
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
  appTheme: AppTheme;
  
  // Analytics Deep Linking
  analyticsFilter: { mode: string, value: string } | null;
  setAnalyticsFilter: (filter: { mode: string, value: string } | null) => void;
  
  // Actions
  switchUser: (userId: string) => void;
  addUser: (name: string, photo?: File, id?: string) => void;
  updateUser: (userId: string, newName: string, photo?: File) => void;
  saveHighScore: (score: number) => void;
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
  exportData: () => void;
  standardizeDatabase: () => void;
  triggerConfetti: () => void;
  triggerFireworks: () => void;
  setAppTheme: (theme: AppTheme) => void;
  
  // Recovery
  getLocalDataStats: () => Promise<{ users: number, credits: number, wishlist: number }>;
  forceMigrateLocalData: () => Promise<void>;
  repairDatabase: () => Promise<void>;
  reconstructMissingProfiles: () => Promise<void>;
  nuclearReset: () => Promise<void>;
  manualRefresh: () => void;
  scanAllCredits: () => Promise<void>;
  
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
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [coasters, setCoasters] = useState<Coaster[]>(INITIAL_COASTERS);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [wishlist, setWishlist] = useState<WishlistEntry[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [coasterListViewMode, setCoasterListViewMode] = useState<'CREDITS' | 'WISHLIST'>('CREDITS');
  const [notification, setNotification] = useState<Notification | null>(null);
  const [lastSearchQuery, setLastSearchQuery] = useState('');
  const [coasterToLog, setCoasterToLog] = useState<Coaster | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const manualRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    setIsSyncing(true);
    showNotification("Refreshing cloud data...", "info");
  }, []);
  const [appTheme, setAppTheme] = useState<AppTheme>('sky');
  
  // Animations
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);

  // Deep linking for analytics
  const [analyticsFilter, setAnalyticsFilter] = useState<{ mode: string, value: string } | null>(null);

  // --- AUTH ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    try {
      // Force the account selection dialog to appear
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, googleProvider);
      showNotification("Signed in successfully!", "success");
    } catch (error: any) {
      console.error("Sign in error", error);
      
      let message = "Failed to sign in";
      if (error.code === 'auth/unauthorized-domain') {
        message = "Domain not authorized in Firebase. Please add this domain to your Firebase Console.";
      } else if (error.code === 'auth/network-request-failed') {
        message = "Network error: Please check your internet connection or disable ad-blockers/firewalls.";
      } else if (error.code === 'auth/popup-blocked') {
        message = "Sign-in popup was blocked by your browser.";
      } else if (error.code === 'auth/popup-closed-by-user') {
        message = "Sign-in window was closed before completion.";
      } else if (error.message) {
        message = `Sign-in error: ${error.message}`;
      }
      
      showNotification(message, "error");
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setActiveUserId(null);
      setUsers([]);
      setCredits([]);
      setWishlist([]);
      showNotification("Signed out", "info");
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  // --- INITIALIZATION & REAL-TIME SYNC ---
  useEffect(() => {
    const initializeAndSync = async () => {
      try {
        // 1. First, ensure any old localStorage data is moved to IndexedDB
        await storage.migrateFromLocalStorage();

        if (!currentUser) {
          // --- LOCAL MODE ---
          const localUsers = await storage.get<User[]>('cc_users');
          const localCredits = await storage.get<Credit[]>('cc_credits');
          const localWishlist = await storage.get<WishlistEntry[]>('cc_wishlist');
          const localActiveId = await storage.get<string>('cc_active_user_id');

          setUsers(localUsers && localUsers.length > 0 ? localUsers : INITIAL_USERS);
          setCredits(localCredits || []);
          setWishlist(localWishlist || []);
          setActiveUserId(localActiveId || (localUsers && localUsers.length > 0 ? localUsers[0].id : INITIAL_USERS[0].id));
          
          setIsInitialized(true);
          setIsSyncing(false);
          return;
        }

        // --- CLOUD MODE ---
        const uid = currentUser.uid;
        setIsSyncing(true);

      // Migration logic: If we have local data, move it to Firestore
      const localUsers = await storage.get<User[]>('cc_users');
      const localCredits = await storage.get<Credit[]>('cc_credits');
      const localWishlist = await storage.get<WishlistEntry[]>('cc_wishlist');

      // Even if localUsers is null, we might have credits for the default INITIAL_USERS
      const usersToMigrate = localUsers || INITIAL_USERS;
      const hasDataToMigrate = (localCredits && localCredits.length > 0) || 
                               (localWishlist && localWishlist.length > 0) || 
                               (localUsers && localUsers.length > 0);

      if (hasDataToMigrate) {
        showNotification("Syncing your local data to the cloud...", "info");
        const batch = writeBatch(db);

        // Migrate Users (including INITIAL_USERS if they have data)
        for (const u of usersToMigrate) {
          const userRef = doc(db, 'users', u.id);
          batch.set(userRef, { ...u, ownerId: uid });
        }

        // Migrate Credits
        if (localCredits) {
          for (const c of localCredits) {
            const creditRef = doc(db, 'credits', c.id);
            batch.set(creditRef, { ...c, ownerId: uid });
          }
        }

        // Migrate Wishlist
        if (localWishlist) {
          for (const w of localWishlist) {
            const wishlistRef = doc(db, 'wishlist', w.id);
            batch.set(wishlistRef, { ...w, ownerId: uid });
          }
        }

        try {
          await batch.commit();
          // Clear local storage after successful migration to prevent double migration
          await storage.set('cc_users', null);
          await storage.set('cc_credits', null);
          await storage.set('cc_wishlist', null);
          showNotification("Cloud sync complete!", "success");
        } catch (err) {
          console.error("Migration failed", err);
          showNotification("Cloud sync encountered an issue. Some data might not be synced yet.", "error");
        }
      }

      // Start Real-time Sync from Firestore
      const qUsers = query(collection(db, 'users'), where('ownerId', '==', uid));
      const unsubUsers = onSnapshot(qUsers, (snapshot) => {
        const loadedUsers = snapshot.docs.map(doc => doc.data() as User);
        if (loadedUsers.length > 0) {
          setUsers(loadedUsers);
          storage.get<string>('cc_active_user_id').then(id => {
            if (id && loadedUsers.some(u => u.id === id)) {
              setActiveUserId(id);
            } else {
              setActiveUserId(loadedUsers[0].id);
            }
          });
        } else {
          setUsers(INITIAL_USERS);
          setActiveUserId(INITIAL_USERS[0].id);
        }
        setIsSyncing(false);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'users');
        setIsSyncing(false);
      });

      const unsubCoasters = onSnapshot(collection(db, 'coasters'), (snapshot) => {
        const loadedCoasters = snapshot.docs.map(doc => doc.data() as Coaster);
        const customOnes = loadedCoasters.filter(c => c.isCustom);
        setCoasters([...INITIAL_COASTERS, ...customOnes]);
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'coasters'));

      const qCredits = query(collection(db, 'credits'), where('ownerId', '==', uid));
      const unsubCredits = onSnapshot(qCredits, (snapshot) => {
        setCredits(snapshot.docs.map(doc => doc.data() as Credit));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'credits'));

      const qWishlist = query(collection(db, 'wishlist'), where('ownerId', '==', uid));
      const unsubWishlist = onSnapshot(qWishlist, (snapshot) => {
        setWishlist(snapshot.docs.map(doc => doc.data() as WishlistEntry));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'wishlist'));

      setIsInitialized(true);
      
      // Safety: ensure syncing spinner stops after 5s even if listeners are slow
      setTimeout(() => setIsSyncing(false), 5000);

      return () => {
        unsubUsers();
        unsubCoasters();
        unsubCredits();
        unsubWishlist();
      };
    } catch (err) {
      console.error("Initialization failed", err);
      setIsSyncing(false);
      setIsInitialized(true);
      return () => {};
    }
    };

    const cleanupPromise = initializeAndSync();
    return () => {
      cleanupPromise.then(cleanup => cleanup && typeof cleanup === 'function' && cleanup());
    };
  }, [currentUser, refreshKey]);

  // Theme persistence
  useEffect(() => {
    storage.get<AppTheme>('cc_theme').then(theme => {
      if (theme) setAppTheme(theme);
    });
  }, []);

  useEffect(() => {
      if (!isInitialized) return;
      storage.set('cc_theme', appTheme);
  }, [appTheme, isInitialized]);

  useEffect(() => {
      if (!isInitialized || !activeUserId) return;
      storage.set('cc_active_user_id', activeUserId);
  }, [activeUserId, isInitialized]);

  const activeUser = users.find(u => u.id === activeUserId) || users[0] || null;

  const switchUser = (userId: string) => {
    setActiveUserId(userId);
    changeView('DASHBOARD');
    showNotification(`Welcome back, ${users.find(u => u.id === userId)?.name}!`);
  };

  const addUser = async (name: string, photo?: File, id?: string) => {
    let avatarUrl;
    if (photo) {
        avatarUrl = await compressImage(photo);
    }
    const newUser: User = {
      id: id || generateId('u'),
      ownerId: currentUser?.uid || 'local',
      name,
      avatarColor: 'bg-emerald-500',
      avatarUrl
    };

    if (currentUser) {
      try {
        await setDoc(doc(db, 'users', newUser.id), newUser);
        switchUser(newUser.id);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${newUser.id}`);
      }
    } else {
      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      await storage.set('cc_users', updatedUsers);
      switchUser(newUser.id);
      showNotification("Local profile created!");
    }
  };

  const updateUser = async (userId: string, newName: string, photo?: File) => {
      let avatarUrl;
      if (photo) {
          avatarUrl = await compressImage(photo);
      }
      
      if (currentUser) {
        try {
          await updateDoc(doc(db, 'users', userId), {
            name: newName,
            ...(avatarUrl ? { avatarUrl } : {})
          });
          showNotification("Profile updated");
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
        }
      } else {
        const updatedUsers = users.map(u => u.id === userId ? { ...u, name: newName, ...(avatarUrl ? { avatarUrl } : {}) } : u);
        setUsers(updatedUsers);
        await storage.set('cc_users', updatedUsers);
        showNotification("Local profile updated");
      }
  };

  const saveHighScore = async (score: number) => {
      if (!activeUser) return;
      const currentHigh = activeUser.highScore || 0;
      if (score > currentHigh) {
          if (currentUser) {
            try {
              await updateDoc(doc(db, 'users', activeUser.id), { highScore: score });
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, `users/${activeUser.id}`);
            }
          } else {
            const updatedUsers = users.map(u => u.id === activeUser.id ? { ...u, highScore: score } : u);
            setUsers(updatedUsers);
            await storage.set('cc_users', updatedUsers);
          }
      }
  };

  const updateRankings = async (rankings: RankingList) => {
      if (!activeUser) return;
      if (currentUser) {
        try {
          await updateDoc(doc(db, 'users', activeUser.id), { rankings });
          showNotification("Rankings saved!", "success");
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${activeUser.id}`);
        }
      } else {
        const updatedUsers = users.map(u => u.id === activeUser.id ? { ...u, rankings } : u);
        setUsers(updatedUsers);
        await storage.set('cc_users', updatedUsers);
        showNotification("Local rankings saved!", "success");
      }
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
    if (!activeUser) {
      showNotification("Please select a profile to log credits", "error");
      return;
    }

    let photoUrl;
    let gallery: string[] = [];

    if (photos.length > 0) {
        const processed = await Promise.all(photos.map(p => compressImage(p)));
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
      variant
    };
    
    if (currentUser) {
      try {
        await setDoc(doc(db, 'credits', newCredit.id), newCredit);
        if (isInWishlist(coasterId)) {
            removeFromWishlist(coasterId);
        }
        return newCredit;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `credits/${newCredit.id}`);
      }
    } else {
      const updatedCredits = [...credits, newCredit];
      setCredits(updatedCredits);
      await storage.set('cc_credits', updatedCredits);
      if (isInWishlist(coasterId)) {
          removeFromWishlist(coasterId);
      }
      showNotification("Credit logged locally!");
      return newCredit;
    }
  };

  const updateCredit = async (creditId: string, date: string, notes: string, restraints: string, mainPhotoUrl: string | undefined, gallery: string[], newPhotos: File[] = [], variant?: string) => {
      let newGallery = [...gallery];
      
      if (newPhotos && newPhotos.length > 0) {
          const processedNew = await Promise.all(newPhotos.map(p => compressImage(p)));
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
            variant
          });
          showNotification("Log updated successfully", "success");
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `credits/${creditId}`);
        }
      } else {
        const updatedCredits = credits.map(c => c.id === creditId ? {
          ...c,
          date,
          notes,
          restraints,
          photoUrl: mainPhotoUrl,
          gallery: newGallery,
          variant
        } : c);
        setCredits(updatedCredits);
        await storage.set('cc_credits', updatedCredits);
        showNotification("Local log updated successfully", "success");
      }
  };

  const deleteCredit = async (creditId: string) => {
    if (currentUser) {
      try {
        await deleteDoc(doc(db, 'credits', creditId));
        showNotification("Ride log deleted", 'info');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `credits/${creditId}`);
      }
    } else {
      const updatedCredits = credits.filter(c => c.id !== creditId);
      setCredits(updatedCredits);
      await storage.set('cc_credits', updatedCredits);
      showNotification("Local ride log deleted", 'info');
    }
  };

  const addNewCoaster = async (coasterData: Omit<Coaster, 'id'>) => {
    const exists = coasters.find(c => 
        cleanName(c.name).toLowerCase() === cleanName(coasterData.name).toLowerCase() && 
        cleanName(c.park).toLowerCase() === cleanName(coasterData.park).toLowerCase()
    );

    if (exists) {
        showNotification("Coaster already exists!", "error");
        return exists;
    }

    const newCoaster: Coaster = {
      ...coasterData,
      id: generateId('c'),
      manufacturer: normalizeManufacturer(coasterData.manufacturer),
      park: normalizeParkName(coasterData.park),
      country: normalizeCountry(coasterData.country),
      isCustom: true
    };
    
    try {
      await setDoc(doc(db, 'coasters', newCoaster.id), newCoaster);
      return newCoaster;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `coasters/${newCoaster.id}`);
      return newCoaster; // Return anyway to allow local use if rules fail but app logic expects it
    }
  };

  const editCoaster = async (id: string, updates: Partial<Coaster>) => {
      const coaster = coasters.find(c => c.id === id);
      if (!coaster) return;

      const updated = { ...coaster, ...updates };
      if (updates.manufacturer) updated.manufacturer = normalizeManufacturer(updates.manufacturer);
      if (updates.park) updated.park = normalizeParkName(updates.park);
      if (updates.country) updated.country = normalizeCountry(updates.country);

      try {
        await updateDoc(doc(db, 'coasters', id), updated);
        showNotification("Coaster details updated", "success");
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `coasters/${id}`);
      }
  };

  const addMultipleCoasters = async (newCoasters: Omit<Coaster, 'id'>[]) => {
      const batch = writeBatch(db);
      let count = 0;

      newCoasters.forEach(c => {
          const exists = coasters.find(existing => 
             cleanName(existing.name).toLowerCase() === cleanName(c.name).toLowerCase() &&
             cleanName(existing.park).toLowerCase() === cleanName(c.park).toLowerCase()
          );
          if (!exists) {
              const id = generateId('c');
              const newC = {
                  ...c,
                  id,
                  manufacturer: normalizeManufacturer(c.manufacturer),
                  park: normalizeParkName(c.park),
                  country: normalizeCountry(c.country),
                  isCustom: true
              };
              batch.set(doc(db, 'coasters', id), newC);
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

  const searchOnlineCoaster = async (query: string) => {
      return await generateCoasterInfo(query);
  };

  const extractFromUrl = async (url: string) => {
      return await extractCoasterFromUrl(url);
  };

  const generateIcon = async (prompt: string) => {
      return await generateAppIcon(prompt);
  };

  const addToWishlist = async (coasterId: string) => {
      if (!activeUser) {
        showNotification("Please select a profile to add to wishlist", "error");
        return;
      }

      if (!isInWishlist(coasterId)) {
          const entry: WishlistEntry = {
              id: generateId('w'),
              userId: activeUser.id,
              ownerId: currentUser?.uid || 'local',
              coasterId,
              addedAt: new Date().toISOString()
          };
          
          if (currentUser) {
            try {
              await setDoc(doc(db, 'wishlist', entry.id), entry);
              showNotification("Added to Bucket List", "success");
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, `wishlist/${entry.id}`);
            }
          } else {
            const updatedWishlist = [...wishlist, entry];
            setWishlist(updatedWishlist);
            await storage.set('cc_wishlist', updatedWishlist);
            showNotification("Added to local Bucket List", "success");
          }
      }
  };

  const removeFromWishlist = async (coasterId: string) => {
      if (!activeUser) return;
      const entry = wishlist.find(w => w.userId === activeUser.id && w.coasterId === coasterId);
      if (entry) {
          if (currentUser) {
            try {
              await deleteDoc(doc(db, 'wishlist', entry.id));
              showNotification("Removed from Bucket List", "info");
            } catch (err) {
              handleFirestoreError(err, OperationType.DELETE, `wishlist/${entry.id}`);
            }
          } else {
            const updatedWishlist = wishlist.filter(w => w.id !== entry.id);
            setWishlist(updatedWishlist);
            await storage.set('cc_wishlist', updatedWishlist);
            showNotification("Removed from local Bucket List", "info");
          }
      }
  };

  const isInWishlist = (coasterId: string) => {
      if (!activeUser) return false;
      return wishlist.some(w => w.userId === activeUser.id && w.coasterId === coasterId);
  };

  const enrichDatabaseImages = async () => {
      showNotification("Enriching database... this may take a moment.", 'info');
      let updatedCount = 0;
      
      for (let i = 0; i < coasters.length; i++) {
          const c = coasters[i];
          if (!c.imageUrl || c.imageUrl.includes('picsum')) {
              const url = await fetchCoasterImageFromWiki(c.name, c.park);
              if (url) {
                  await editCoaster(c.id, { imageUrl: url });
                  updatedCount++;
              }
          }
      }

      if (updatedCount > 0) {
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
          updateCoasterImage(coasterId, url);
      }
      return url;
  };

  const updateCoasterImage = async (coasterId: string, imageUrl: string) => {
      try {
        await updateDoc(doc(db, 'coasters', coasterId), { imageUrl });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `coasters/${coasterId}`);
      }
  };

  const standardizeDatabase = async () => {
      const batch = writeBatch(db);
      let count = 0;
      coasters.forEach(c => {
          if (c.isCustom) {
            batch.update(doc(db, 'coasters', c.id), {
              manufacturer: normalizeManufacturer(c.manufacturer),
              park: normalizeParkName(c.park),
              country: normalizeCountry(c.country)
            });
            count++;
          }
      });
      
      if (count > 0) {
        try {
          await batch.commit();
          showNotification("Database standardized.", 'success');
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'coasters (standardize batch)');
        }
      }
  };

  const clearStoragePhotos = async () => {
      if (window.confirm("This will remove all uploaded photos from logs to free up space. Text data remains. Continue?")) {
           const batch = writeBatch(db);
           credits.forEach(c => {
             batch.update(doc(db, 'credits', c.id), { photoUrl: null, gallery: [] });
           });
           try {
             await batch.commit();
             showNotification("Storage cleared.", 'success');
           } catch (err) {
             handleFirestoreError(err, OperationType.WRITE, 'credits (clear photos batch)');
           }
      }
  };

  const importData = async (jsonData: any) => {
      try {
        if (!jsonData) {
          showNotification("No data provided for import.", "error");
          return;
        }

        let rawData;
        try {
          rawData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        } catch (parseErr) {
          console.error("JSON Parse Error", parseErr);
          showNotification("Invalid JSON format. Please check your file.", "error");
          return;
        }
        
        let data: any = {};
        if (Array.isArray(rawData)) {
          data = { credits: rawData };
        } else if (typeof rawData === 'object' && rawData !== null) {
          data = rawData;
        } else {
          showNotification("Unsupported data format. Expected JSON object or array.", "error");
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

          // Helper for batching
          let batch = writeBatch(db);
          let batchCount = 0;
          const commitBatchIfNeeded = async (force = false) => {
            if (batchCount >= 450 || (force && batchCount > 0)) {
              await batch.commit();
              batch = writeBatch(db);
              batchCount = 0;
            }
          };

          // Helper to remove undefined/null/empty fields and normalize types for Firestore
          const clean = (obj: any): any => {
            if (obj === null || obj === undefined) return undefined;
            
            // Handle Arrays
            if (Array.isArray(obj)) {
              return obj.map(v => clean(v)).filter(v => v !== undefined);
            }
            
            // Handle Objects
            if (typeof obj === 'object') {
              const newObj: any = {};
              let hasData = false;
              
              Object.keys(obj).forEach(key => {
                const val = obj[key];
                
                // Skip empty values
                if (val === undefined || val === null || val === '') return;
                
                // Special handling for specific fields
                if (key === 'date' || key === 'addedAt') {
                  try {
                    const d = new Date(val);
                    if (!isNaN(d.getTime())) {
                      newObj[key] = d.toISOString();
                      hasData = true;
                    }
                  } catch (e) {
                    // Keep original if date parsing fails, rules will catch it
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
                  const cleanedVal = clean(val);
                  if (cleanedVal !== undefined) {
                    newObj[key] = cleanedVal;
                    hasData = true;
                  }
                }
              });
              
              return hasData ? newObj : undefined;
            }
            
            // Handle Primitives
            return obj;
          };

          // 1. Handle Users
          if (data.users && Array.isArray(data.users)) {
            for (const u of data.users) {
              if (!u.name) continue;
              
              // Check if this user already exists in our local state (synced from cloud)
              const existing = users.find(e => e.name.toLowerCase() === u.name.toLowerCase());
              
              if (existing) {
                userIdMap[u.id] = existing.id;
              } else {
                // For the primary user 'u1', we might want to map it to a more unique ID 
                // to avoid collisions in a shared database environment
                let newId = u.id || generateId('u');
                
                // If it's the default 'u1', make it unique to this owner
                if (newId === 'u1') {
                  newId = `u_${uid.substring(0, 8)}`;
                }
                
                userIdMap[u.id || newId] = newId;
                
                // SELECTIVE FIELDS to avoid document size issues
                // Also protect against massive base64 strings in avatarUrl
                let avatarUrl = u.avatarUrl;
                if (avatarUrl && avatarUrl.startsWith('data:image') && avatarUrl.length > 102400) {
                  console.warn(`Avatar for user ${u.name} is too large (${avatarUrl.length} bytes), skipping to prevent document size errors.`);
                  avatarUrl = undefined;
                }

                // Limit rankings size if they are absurdly large
                let rankings = u.rankings;
                if (rankings) {
                  const limitArray = (arr: any[]) => (arr && arr.length > 2000) ? arr.slice(0, 2000) : arr;
                  rankings = {
                    ...rankings,
                    overall: limitArray(rankings.overall),
                    steel: limitArray(rankings.steel),
                    wooden: limitArray(rankings.wooden)
                  };
                }

                const newUser = clean({
                  id: newId,
                  ownerId: uid,
                  name: u.name,
                  avatarColor: u.avatarColor || 'bg-blue-500',
                  avatarUrl: avatarUrl,
                  rankings: rankings,
                  highScore: u.highScore
                });
                
                batch.set(doc(db, 'users', newId), newUser);
                batchCount++;
                usersAdded++;
                await commitBatchIfNeeded();
              }
            }
          }

          // 2. Handle Coasters
          if (data.coasters && Array.isArray(data.coasters)) {
            for (const c of data.coasters) {
              if (!c.name || !c.park) continue;
              const existing = coasters.find(e => 
                cleanName(e.name).toLowerCase() === cleanName(c.name).toLowerCase() &&
                cleanName(e.park).toLowerCase() === cleanName(c.park).toLowerCase()
              );

              if (existing) {
                coasterIdMap[c.id] = existing.id;
              } else {
                const newId = c.id || generateId('c');
                coasterIdMap[c.id || newId] = newId;
                
                // SELECTIVE FIELDS
                const newC = clean({
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
                  audioUrl: c.audioUrl
                });
                
                batch.set(doc(db, 'coasters', newId), newC);
                batchCount++;
                coastersAdded++;
                await commitBatchIfNeeded();
              }
            }
          }

          // 3. Handle Credits
          if (data.credits && Array.isArray(data.credits)) {
            for (const c of data.credits) {
              if (!c.coasterId && !c.coasterName) continue;

              const creditId = c.id || generateId('cr');
              const alreadyExists = credits.find(existing => existing.id === creditId);
              
              if (!alreadyExists) {
                const newCoasterId = coasterIdMap[c.coasterId] || c.coasterId || 'unknown_coaster';
                const newUserId = userIdMap[c.userId] || (users.find(u => u.id === c.userId) ? c.userId : activeUser?.id || users[0]?.id);
                
                if (!newCoasterId || !newUserId) continue;

                // SELECTIVE FIELDS
                const newCredit = clean({
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
                  variant: c.variant
                });
                
                batch.set(doc(db, 'credits', creditId), newCredit);
                batchCount++;
                creditsAdded++;
                await commitBatchIfNeeded();
              }
            }
          }

          // 4. Handle Wishlist
          if (data.wishlist && Array.isArray(data.wishlist)) {
            for (const w of data.wishlist) {
              if (!w.coasterId) continue;

              const wishlistId = w.id || generateId('w');
              const alreadyExists = wishlist.find(existing => existing.id === wishlistId);
              
              if (!alreadyExists) {
                const newCoasterId = coasterIdMap[w.coasterId] || w.coasterId || 'unknown_coaster';
                const newUserId = userIdMap[w.userId] || (users.find(u => u.id === w.userId) ? w.userId : activeUser?.id || users[0]?.id);
                
                if (!newCoasterId || !newUserId) continue;

                // SELECTIVE FIELDS
                const newWishlist = clean({
                  id: wishlistId,
                  coasterId: newCoasterId,
                  userId: newUserId,
                  ownerId: uid,
                  addedAt: w.addedAt || new Date().toISOString(),
                  notes: w.notes
                });
                
                batch.set(doc(db, 'wishlist', wishlistId), newWishlist);
                batchCount++;
                wishlistAdded++;
                await commitBatchIfNeeded();
              }
            }
          }

          await commitBatchIfNeeded(true);
          
          if (coastersAdded > 0 || usersAdded > 0 || creditsAdded > 0 || wishlistAdded > 0) {
            showNotification(`Import successful! Added ${usersAdded} users, ${coastersAdded} coasters, ${creditsAdded} credits, and ${wishlistAdded} wishlist items to your cloud account.`, "success");
          } else {
            showNotification("No new data found to import.", "info");
          }
        } else {
          // --- LOCAL MODE IMPORT ---
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
              const existing = localUsers.find(e => e.name.toLowerCase() === u.name.toLowerCase());
              if (existing) {
                userIdMap[u.id] = existing.id;
              } else {
                // SELECTIVE FIELDS to avoid document size issues
                let avatarUrl = u.avatarUrl;
                if (avatarUrl && avatarUrl.startsWith('data:image') && avatarUrl.length > 102400) {
                  avatarUrl = undefined;
                }

                let rankings = u.rankings;
                if (rankings) {
                  const limitArray = (arr: any[]) => (arr && arr.length > 2000) ? arr.slice(0, 2000) : arr;
                  rankings = {
                    ...rankings,
                    overall: limitArray(rankings.overall),
                    steel: limitArray(rankings.steel),
                    wooden: limitArray(rankings.wooden)
                  };
                }

                let newId = u.id || generateId('u');
                if (newId === 'u1') {
                  newId = `u_local_${generateId('u').substring(0, 4)}`;
                }
                userIdMap[u.id || newId] = newId;

                localUsers.push({ 
                  id: newId, 
                  ownerId: 'local',
                  name: u.name,
                  avatarColor: u.avatarColor || 'bg-blue-500',
                  avatarUrl: avatarUrl,
                  rankings: rankings,
                  highScore: u.highScore
                });
                usersAdded++;
              }
            });
          }

          if (data.coasters && Array.isArray(data.coasters)) {
            data.coasters.forEach((c: any) => {
              if (!c.name || !c.park) return;
              const existing = localCoasters.find(e => 
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
                  audioUrl: c.audioUrl
                });
                coastersAdded++;
              }
            });
          }

          if (data.credits && Array.isArray(data.credits)) {
            data.credits.forEach((c: any) => {
              if (!c.coasterId && !c.coasterName) return;
              const creditId = c.id || generateId('cr');
              if (!localCredits.some(existing => existing.id === creditId)) {
                const newCoasterId = coasterIdMap[c.coasterId] || c.coasterId || 'unknown_coaster';
                const newUserId = userIdMap[c.userId] || (localUsers.find(u => u.id === c.userId) ? c.userId : activeUser?.id || localUsers[0]?.id);
                
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
                  variant: c.variant
                });
                creditsAdded++;
              }
            });
          }

          if (data.wishlist && Array.isArray(data.wishlist)) {
            data.wishlist.forEach((w: any) => {
              if (!w.coasterId) return;
              const wishlistId = w.id || generateId('w');
              if (!localWishlist.some(existing => existing.id === wishlistId)) {
                const newCoasterId = coasterIdMap[w.coasterId] || w.coasterId || 'unknown_coaster';
                const newUserId = userIdMap[w.userId] || (localUsers.find(u => u.id === w.userId) ? w.userId : activeUser?.id || localUsers[0]?.id);
                
                if (!newCoasterId || !newUserId) return;

                localWishlist.push({ 
                  id: wishlistId,
                  coasterId: newCoasterId, 
                  userId: newUserId, 
                  ownerId: 'local',
                  addedAt: w.addedAt || new Date().toISOString(),
                  notes: w.notes
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
            await storage.set('cc_coasters', localCoasters.filter(c => c.isCustom));
            
            showNotification(`Local import successful! Added ${usersAdded} users, ${coastersAdded} coasters, ${creditsAdded} credits, and ${wishlistAdded} wishlist items.`, "success");
          } else {
            showNotification("No new local data found to import.", "info");
          }
        }
      } catch (err) {
        console.error("Import failed", err);
        showNotification(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`, "error");
      }
  };

  const exportData = () => {
    try {
      const data = {
        users,
        credits,
        wishlist,
        coasters: coasters.filter(c => c.isCustom),
        exportDate: new Date().toISOString(),
        version: '1.1.0'
      };
      
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `CoasterCount_Backup_${new Date().toISOString().split('T')[0]}.json`;
      
      // Append to body to ensure it works in all environments
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      showNotification("JSON Backup Exported Successfully", "success");
    } catch (err) {
      console.error("Export failed", err);
      showNotification("Export failed. Please try again.", "error");
    }
  };

  const getLocalDataStats = async () => {
    const localUsers = await storage.get<User[]>('cc_users');
    const localCredits = await storage.get<Credit[]>('cc_credits');
    const localWishlist = await storage.get<WishlistEntry[]>('cc_wishlist');
    
    return {
      users: localUsers?.length || 0,
      credits: localCredits?.length || 0,
      wishlist: localWishlist?.length || 0
    };
  };

  const forceMigrateLocalData = async () => {
    if (!currentUser) {
      showNotification("You must be signed in to migrate data to the cloud.", "error");
      return;
    }

    setIsSyncing(true);
    try {
      const stats = await getLocalDataStats();
      if (stats.users === 0 && stats.credits === 0 && stats.wishlist === 0) {
        showNotification("No local data found to migrate.", "info");
        return;
      }

      const uid = currentUser.uid;
      const localUsers = await storage.get<User[]>('cc_users');
      const localCredits = await storage.get<Credit[]>('cc_credits');
      const localWishlist = await storage.get<WishlistEntry[]>('cc_wishlist');

      const batch = writeBatch(db);
      const usersToMigrate = localUsers || INITIAL_USERS;

      // To avoid permission errors with shared default IDs like 'u1', 
      // we'll check if the user exists and if we own it.
      // If we don't own it, we skip it to prevent the whole batch from failing.
      const { getDoc, doc } = await import('firebase/firestore');
      
      for (const u of usersToMigrate) {
        const userRef = doc(db, 'users', u.id);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists() || userSnap.data()?.ownerId === uid) {
          batch.set(userRef, { ...u, ownerId: uid });
        } else {
          console.warn(`Skipping migration of user ${u.id} as it is owned by another account.`);
        }
      }

      if (localCredits) {
        for (const c of localCredits) {
          const creditRef = doc(db, 'credits', c.id);
          const creditSnap = await getDoc(creditRef);
          if (!creditSnap.exists() || creditSnap.data()?.ownerId === uid) {
            batch.set(creditRef, { ...c, ownerId: uid });
          }
        }
      }
      if (localWishlist) {
        for (const w of localWishlist) {
          const wishlistRef = doc(db, 'wishlist', w.id);
          const wishlistSnap = await getDoc(wishlistRef);
          if (!wishlistSnap.exists() || wishlistSnap.data()?.ownerId === uid) {
            batch.set(wishlistRef, { ...w, ownerId: uid });
          }
        }
      }

      await batch.commit();
      await storage.set('cc_users', null);
      await storage.set('cc_credits', null);
      await storage.set('cc_wishlist', null);
      
      showNotification("Manual migration successful!", "success");
      manualRefresh();
    } catch (err) {
      console.error("Manual migration failed", err);
      showNotification("Migration failed. Some data might be already owned by another account.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const repairDatabase = async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    showNotification("Repairing database links...", "info");

    try {
      const uid = currentUser.uid;
      const batch = writeBatch(db);
      let repairedCount = 0;

      // 1. Find credits that belong to the user's profiles but have wrong/no ownerId
      const userProfileIds = new Set(users.map(u => u.id));
      
      // We need to fetch all credits to find orphaned ones (Admin only or deep scan)
      const { getDocs, query, where } = await import('firebase/firestore');
      
      // Try to find credits by userId (profile ID)
      for (const profileId of userProfileIds) {
        const q = query(collection(db, 'credits'), where('userId', '==', profileId));
        const snap = await getDocs(q);
        snap.docs.forEach(docSnap => {
          const data = docSnap.data();
          if (data.ownerId !== uid) {
            batch.update(docSnap.ref, { ownerId: uid });
            repairedCount++;
          }
        });
      }

      if (repairedCount > 0) {
        await batch.commit();
        showNotification(`Repaired ${repairedCount} data links!`, "success");
        manualRefresh();
      } else {
        showNotification("No repairable data found.", "info");
      }
    } catch (err) {
      console.error("Repair failed", err);
      showNotification("Repair failed. Try the Global Scan.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const reconstructMissingProfiles = async () => {
    if (!currentUser) return;
    const isAdmin = currentUser.email === "k.anaya.izquierdo@gmail.com";
    if (!isAdmin) return;

    setIsSyncing(true);
    showNotification("Reconstructing missing profiles...", "info");

    try {
      const missingUserIds = new Set<string>();
      const existingUserIds = new Set(users.map(u => u.id));

      credits.forEach(c => {
        if (!existingUserIds.has(c.userId)) {
          missingUserIds.add(c.userId);
        }
      });

      if (missingUserIds.size === 0) {
        showNotification("No missing profiles detected.", "info");
        return;
      }

      const newUsersList: User[] = [];
      const batch = writeBatch(db);
      
      for (const id of Array.from(missingUserIds)) {
        // Check if user already exists in Firestore (even if not in current state)
        const userRef = doc(db, 'users', id);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          const newUser: User = {
            id,
            name: `Recovered Profile (${id.length > 4 ? id.slice(-4) : id})`,
            ownerId: currentUser.uid,
            avatarColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 6)]
          };
          newUsersList.push(newUser);
          batch.set(userRef, newUser);
        }
      }

      if (newUsersList.length > 0) {
        await batch.commit();
        setUsers(prev => [...prev, ...newUsersList]);
        showNotification(`Successfully reconstructed ${newUsersList.length} profiles!`, "success");
      } else {
        showNotification("All missing profiles already exist in the database.", "info");
      }
    } catch (err) {
      console.error("Reconstruction failed", err);
      showNotification("Reconstruction failed.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const nuclearReset = async () => {
    if (window.confirm("NUCLEAR OPTION: This will clear your local cache and force a complete re-sync from the cloud. No cloud data will be deleted. Continue?")) {
      setIsSyncing(true);
      try {
        // Clear local storage
        localStorage.clear();
        // Keep auth session if possible, but clear data
        await storage.set('cc_users', null);
        await storage.set('cc_credits', null);
        await storage.set('cc_wishlist', null);
        
        // Reload page to start fresh
        window.location.reload();
      } catch (err) {
        showNotification("Reset failed", "error");
      }
    }
  };

  const scanAllCredits = async () => {
    if (!currentUser) return;
    
    // Check if user is the designated admin
    const isAdmin = currentUser.email === "k.anaya.izquierdo@gmail.com";
    if (!isAdmin) {
      showNotification("Only admins can perform a global scan.", "error");
      return;
    }

    setIsSyncing(true);
    showNotification("Performing deep global data scan...", "info");

    try {
      const { getDocs, collection } = await import('firebase/firestore');
      
      // 1. Scan ALL credits
      const allCreditsSnapshot = await getDocs(collection(db, 'credits'));
      const allCredits = allCreditsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Credit));
      
      // 2. Scan ALL users
      const allUsersSnapshot = await getDocs(collection(db, 'users'));
      const allUsers = allUsersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));

      // 3. Scan ALL wishlist
      const allWishlistSnapshot = await getDocs(collection(db, 'wishlist'));
      const allWishlist = allWishlistSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as WishlistEntry));
      
      // 4. Deep LocalStorage Scan (Looking for ANY legacy keys)
      const legacyData: any = {};
      const possibleKeys = [
        'users', 'credits', 'wishlist', 'coasters', 'active_user_id',
        'cc_users', 'cc_credits', 'cc_wishlist', 'cc_coasters', 'cc_active_user_id',
        'coaster_data', 'my_credits', 'ride_log'
      ];
      
      possibleKeys.forEach(key => {
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
        console.log("Found Legacy LocalStorage Data:", legacyData);
      }
      
      // Identify orphaned credits
      const existingUserIds = new Set(allUsers.map(u => u.id));
      const orphanedCredits = allCredits.filter(c => !existingUserIds.has(c.userId));
      
      console.log(`Scan Results:
        - Total Credits: ${allCredits.length}
        - Total Users: ${allUsers.length}
        - Orphaned Credits: ${orphanedCredits.length}
        - Legacy Local Keys: ${Object.keys(legacyData).join(', ')}
      `);

      setCredits(allCredits);
      setUsers(allUsers.length > 0 ? allUsers : INITIAL_USERS);
      
      if (orphanedCredits.length > 0) {
        showNotification(`Scan complete. Found ${allCredits.length} credits, including ${orphanedCredits.length} orphaned ones!`, "success");
      } else {
        showNotification(`Scan complete. Found ${allCredits.length} total credits.`, "success");
      }
    } catch (err) {
      console.error("Global scan failed", err);
      showNotification("Global scan failed. Check console for details.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      signIn,
      logout,
      isAuthLoading,
      isSyncing,
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
      saveHighScore,
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
      exportData,
      standardizeDatabase,
      clearStoragePhotos,
      showConfetti,
      triggerConfetti,
      showFireworks,
      triggerFireworks,
      updateRankings,
      analyticsFilter,
      setAnalyticsFilter,
      appTheme,
      setAppTheme,
      getLocalDataStats,
      forceMigrateLocalData,
      repairDatabase,
      reconstructMissingProfiles,
      nuclearReset,
      manualRefresh,
      scanAllCredits
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
