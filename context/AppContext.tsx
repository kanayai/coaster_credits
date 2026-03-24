
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Coaster, Credit, ViewState, WishlistEntry, RankingList } from '../types';
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
        const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        
        if (currentUser) {
          const uid = currentUser.uid;
          const batch = writeBatch(db);
          
          const coasterIdMap: Record<string, string> = {};
          const userIdMap: Record<string, string> = {};
          
          let coastersAdded = 0;
          let usersAdded = 0;
          let creditsAdded = 0;
          let wishlistAdded = 0;

          // 1. Handle Users
          if (data.users && Array.isArray(data.users)) {
            for (const u of data.users) {
              const existing = users.find(e => e.name.toLowerCase() === u.name.toLowerCase());
              if (existing) {
                userIdMap[u.id] = existing.id;
              } else {
                const newId = generateId('u');
                userIdMap[u.id] = newId;
                const newUser = {
                  ...u,
                  id: newId,
                  ownerId: uid
                };
                batch.set(doc(db, 'users', newId), newUser);
                usersAdded++;
              }
            }
          }

          // 2. Handle Coasters
          if (data.coasters && Array.isArray(data.coasters)) {
            for (const c of data.coasters) {
              const existing = coasters.find(e => 
                cleanName(e.name).toLowerCase() === cleanName(c.name).toLowerCase() &&
                cleanName(e.park).toLowerCase() === cleanName(c.park).toLowerCase()
              );

              if (existing) {
                coasterIdMap[c.id] = existing.id;
              } else {
                const newId = generateId('c');
                coasterIdMap[c.id] = newId;
                const newC = {
                  ...c,
                  id: newId,
                  manufacturer: normalizeManufacturer(c.manufacturer),
                  park: normalizeParkName(c.park),
                  country: normalizeCountry(c.country),
                  isCustom: true
                };
                batch.set(doc(db, 'coasters', newId), newC);
                coastersAdded++;
              }
            }
          }

          // 3. Handle Credits
          if (data.credits && Array.isArray(data.credits)) {
            for (const c of data.credits) {
              const alreadyExists = credits.find(existing => existing.id === c.id);
              if (!alreadyExists) {
                const newCoasterId = coasterIdMap[c.coasterId] || c.coasterId;
                const newUserId = userIdMap[c.userId] || (users.find(u => u.id === c.userId) ? c.userId : activeUser?.id || users[0]?.id);
                
                const newCredit = {
                  ...c,
                  coasterId: newCoasterId,
                  userId: newUserId,
                  ownerId: uid
                };
                batch.set(doc(db, 'credits', c.id), newCredit);
                creditsAdded++;
              }
            }
          }

          // 4. Handle Wishlist
          if (data.wishlist && Array.isArray(data.wishlist)) {
            for (const w of data.wishlist) {
              const alreadyExists = wishlist.find(existing => existing.id === w.id);
              if (!alreadyExists) {
                const newCoasterId = coasterIdMap[w.coasterId] || w.coasterId;
                const newUserId = userIdMap[w.userId] || (users.find(u => u.id === w.userId) ? w.userId : activeUser?.id || users[0]?.id);
                
                const newWishlist = {
                  ...w,
                  coasterId: newCoasterId,
                  userId: newUserId,
                  ownerId: uid
                };
                batch.set(doc(db, 'wishlist', w.id), newWishlist);
                wishlistAdded++;
              }
            }
          }

          if (coastersAdded > 0 || usersAdded > 0 || creditsAdded > 0 || wishlistAdded > 0) {
            await batch.commit();
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
              const existing = localUsers.find(e => e.name.toLowerCase() === u.name.toLowerCase());
              if (existing) {
                userIdMap[u.id] = existing.id;
              } else {
                const newId = generateId('u');
                userIdMap[u.id] = newId;
                localUsers.push({ ...u, id: newId, ownerId: 'local' });
                usersAdded++;
              }
            });
          }

          if (data.coasters && Array.isArray(data.coasters)) {
            data.coasters.forEach((c: any) => {
              const existing = localCoasters.find(e => 
                cleanName(e.name).toLowerCase() === cleanName(c.name).toLowerCase() &&
                cleanName(e.park).toLowerCase() === cleanName(c.park).toLowerCase()
              );
              if (existing) {
                coasterIdMap[c.id] = existing.id;
              } else {
                const newId = generateId('c');
                coasterIdMap[c.id] = newId;
                localCoasters.push({ ...c, id: newId, isCustom: true });
                coastersAdded++;
              }
            });
          }

          if (data.credits && Array.isArray(data.credits)) {
            data.credits.forEach((c: any) => {
              if (!localCredits.some(existing => existing.id === c.id)) {
                const newCoasterId = coasterIdMap[c.coasterId] || c.coasterId;
                const newUserId = userIdMap[c.userId] || c.userId;
                localCredits.push({ ...c, coasterId: newCoasterId, userId: newUserId, ownerId: 'local' });
                creditsAdded++;
              }
            });
          }

          if (data.wishlist && Array.isArray(data.wishlist)) {
            data.wishlist.forEach((w: any) => {
              if (!localWishlist.some(existing => existing.id === w.id)) {
                const newCoasterId = coasterIdMap[w.coasterId] || w.coasterId;
                const newUserId = userIdMap[w.userId] || w.userId;
                localWishlist.push({ ...w, coasterId: newCoasterId, userId: newUserId, ownerId: 'local' });
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
            
            showNotification(`Local import successful! Added ${usersAdded} users, ${coastersAdded} coasters, ${creditsAdded} credits, and ${wishlistAdded} wishlist items.`, "success");
          } else {
            showNotification("No new local data found to import.", "info");
          }
        }
      } catch (err) {
        console.error("Import failed", err);
        showNotification("Import failed. Please check your JSON format.", "error");
      }
  };

  const exportData = () => {
    const data = {
      users,
      credits,
      wishlist,
      coasters: coasters.filter(c => c.isCustom),
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CoasterCount_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    showNotification("JSON Backup Exported", "success");
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

    for (const u of usersToMigrate) {
      batch.set(doc(db, 'users', u.id), { ...u, ownerId: uid });
    }
    if (localCredits) {
      for (const c of localCredits) {
        batch.set(doc(db, 'credits', c.id), { ...c, ownerId: uid });
      }
    }
    if (localWishlist) {
      for (const w of localWishlist) {
        batch.set(doc(db, 'wishlist', w.id), { ...w, ownerId: uid });
      }
    }

    try {
      await batch.commit();
      await storage.set('cc_users', null);
      await storage.set('cc_credits', null);
      await storage.set('cc_wishlist', null);
      showNotification("Manual migration successful!", "success");
    } catch (err) {
      console.error("Manual migration failed", err);
      showNotification("Migration failed. Please try again.", "error");
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
    showNotification("Performing global data scan...", "info");

    try {
      const { getDocs } = await import('firebase/firestore');
      const allCreditsSnapshot = await getDocs(collection(db, 'credits'));
      const allCredits = allCreditsSnapshot.docs.map(doc => doc.data() as Credit);
      
      // Also fetch all users to check ownership
      const allUsersSnapshot = await getDocs(collection(db, 'users'));
      const allUsers = allUsersSnapshot.docs.map(doc => doc.data() as User);
      
      // Find credits that belong to the current user but might be missing ownerId
      // This is tricky because we don't know which ones are theirs if ownerId is missing.
      // But if they are an admin, they can see EVERYTHING.
      
      setCredits(allCredits);
      setUsers(allUsers.length > 0 ? allUsers : INITIAL_USERS);
      
      showNotification(`Scan complete. Found ${allCredits.length} total credits in database.`, "success");
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
