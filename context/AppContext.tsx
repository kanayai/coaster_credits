
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
  addUser: (name: string, photo?: File) => void;
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
  standardizeDatabase: () => void;
  triggerConfetti: () => void;
  triggerFireworks: () => void;
  setAppTheme: (theme: AppTheme) => void;
  
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
    if (!currentUser) {
      // Clear data if not logged in
      setUsers([]);
      setCredits([]);
      setWishlist([]);
      setIsInitialized(true);
      return;
    }

    const uid = currentUser.uid;

    // Sync Users
    const qUsers = query(collection(db, 'users'), where('ownerId', '==', uid));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const loadedUsers = snapshot.docs.map(doc => doc.data() as User);
      setUsers(loadedUsers.length > 0 ? loadedUsers : INITIAL_USERS);
      
      // Handle active user selection
      storage.get<string>('cc_active_user_id').then(id => {
        if (id && loadedUsers.some(u => u.id === id)) {
          setActiveUserId(id);
        } else if (loadedUsers.length > 0) {
          setActiveUserId(loadedUsers[0].id);
        } else {
          setActiveUserId(INITIAL_USERS[0].id);
        }
      });
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    // Sync Coasters (Global + Custom)
    const unsubCoasters = onSnapshot(collection(db, 'coasters'), (snapshot) => {
      const loadedCoasters = snapshot.docs.map(doc => doc.data() as Coaster);
      // Merge global initial with custom from DB
      const customOnes = loadedCoasters.filter(c => c.isCustom);
      setCoasters([...INITIAL_COASTERS, ...customOnes]);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'coasters'));

    // Sync Credits
    const qCredits = query(collection(db, 'credits'), where('ownerId', '==', uid));
    const unsubCredits = onSnapshot(qCredits, (snapshot) => {
      setCredits(snapshot.docs.map(doc => doc.data() as Credit));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'credits'));

    // Sync Wishlist
    const qWishlist = query(collection(db, 'wishlist'), where('ownerId', '==', uid));
    const unsubWishlist = onSnapshot(qWishlist, (snapshot) => {
      setWishlist(snapshot.docs.map(doc => doc.data() as WishlistEntry));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'wishlist'));

    setIsInitialized(true);

    return () => {
      unsubUsers();
      unsubCoasters();
      unsubCredits();
      unsubWishlist();
    };
  }, [currentUser]);

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

  const addUser = async (name: string, photo?: File) => {
    if (!currentUser) {
      showNotification("Please sign in to add profiles", "error");
      return;
    }

    let avatarUrl;
    if (photo) {
        avatarUrl = await compressImage(photo);
    }
    const newUser: User = {
      id: generateId('u'),
      ownerId: currentUser.uid,
      name,
      avatarColor: 'bg-emerald-500',
      avatarUrl
    };

    try {
      await setDoc(doc(db, 'users', newUser.id), newUser);
      switchUser(newUser.id);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${newUser.id}`);
    }
  };

  const updateUser = async (userId: string, newName: string, photo?: File) => {
      let avatarUrl;
      if (photo) {
          avatarUrl = await compressImage(photo);
      }
      
      try {
        await updateDoc(doc(db, 'users', userId), {
          name: newName,
          ...(avatarUrl ? { avatarUrl } : {})
        });
        showNotification("Profile updated");
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
      }
  };

  const saveHighScore = async (score: number) => {
      if (!activeUser) return;
      const currentHigh = activeUser.highScore || 0;
      if (score > currentHigh) {
          try {
            await updateDoc(doc(db, 'users', activeUser.id), { highScore: score });
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `users/${activeUser.id}`);
          }
      }
  };

  const updateRankings = async (rankings: RankingList) => {
      if (!activeUser) return;
      try {
        await updateDoc(doc(db, 'users', activeUser.id), { rankings });
        showNotification("Rankings saved!", "success");
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${activeUser.id}`);
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
    if (!currentUser || !activeUser) {
      showNotification("Please sign in to log credits", "error");
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
      ownerId: currentUser.uid,
      coasterId,
      date,
      rideCount: 1,
      notes,
      restraints,
      photoUrl,
      gallery,
      variant
    };
    
    try {
      await setDoc(doc(db, 'credits', newCredit.id), newCredit);
      
      if (isInWishlist(coasterId)) {
          removeFromWishlist(coasterId);
      }
      return newCredit;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `credits/${newCredit.id}`);
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
  };

  const deleteCredit = async (creditId: string) => {
    if (window.confirm("Are you sure you want to delete this ride log?")) {
        try {
          await deleteDoc(doc(db, 'credits', creditId));
          showNotification("Ride log deleted", 'info');
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `credits/${creditId}`);
        }
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
      if (!currentUser || !activeUser) {
        showNotification("Please sign in to add to wishlist", "error");
        return;
      }

      if (!isInWishlist(coasterId)) {
          const entry: WishlistEntry = {
              id: generateId('w'),
              userId: activeUser.id,
              ownerId: currentUser.uid,
              coasterId,
              addedAt: new Date().toISOString()
          };
          try {
            await setDoc(doc(db, 'wishlist', entry.id), entry);
            showNotification("Added to Bucket List", "success");
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `wishlist/${entry.id}`);
          }
      }
  };

  const removeFromWishlist = async (coasterId: string) => {
      if (!activeUser) return;
      const entry = wishlist.find(w => w.userId === activeUser.id && w.coasterId === coasterId);
      if (entry) {
          try {
            await deleteDoc(doc(db, 'wishlist', entry.id));
            showNotification("Removed from Bucket List", "info");
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `wishlist/${entry.id}`);
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

  const importData = (jsonData: any) => {
      showNotification("Import not implemented for Cloud mode yet.", "info");
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      signIn,
      logout,
      isAuthLoading,
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
      setAppTheme
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
