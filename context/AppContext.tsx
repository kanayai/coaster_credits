
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Coaster, Credit, ViewState, WishlistEntry, RankingList } from '../types';
import { INITIAL_COASTERS } from '../constants';
import {
  initializeAndSyncApp,
  logoutCurrentSession,
  signInWithGoogle,
  subscribeToAuthState,
} from './appLifecycle';
import {
  addCreditAction as addCreditDomainAction,
  addMultipleCoastersAction as addMultipleCoastersDomainAction,
  addNewCoasterAction as addNewCoasterDomainAction,
  addToWishlistAction as addToWishlistDomainAction,
  autoFetchCoasterImageAction as autoFetchCoasterImageDomainAction,
  deleteCreditAction as deleteCreditDomainAction,
  editCoasterAction as editCoasterDomainAction,
  enrichDatabaseImagesAction as enrichDatabaseImagesDomainAction,
  extractFromUrlAction as extractFromUrlDomainAction,
  generateIconAction as generateIconDomainAction,
  isInWishlistForUser as isInWishlistForUserDomain,
  removeFromWishlistAction as removeFromWishlistDomainAction,
  searchOnlineCoasterAction as searchOnlineCoasterDomainAction,
  updateCoasterImageAction as updateCoasterImageDomainAction,
  updateCreditAction as updateCreditDomainAction,
} from './domainActions';
import {
  addUserAction,
  clearStoragePhotosAction,
  exportDataAction,
  forceMigrateLocalDataAction,
  getLocalDataStatsAction,
  importDataAction,
  nuclearResetAction,
  reconstructMissingProfilesAction,
  repairDatabaseAction,
  saveHighScoreAction,
  scanAllCreditsAction,
  standardizeDatabaseAction,
  updateRankingsAction,
  updateUserAction,
} from './dataManagement';
import { storage } from '../services/storage';
import { 
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
    return subscribeToAuthState({ setCurrentUser, setIsAuthLoading });
  }, []);

  const signIn = async () => {
    await signInWithGoogle(showNotification);
  };

  const logout = async () => {
    await logoutCurrentSession({
      setActiveUserId,
      setUsers,
      setCredits,
      setWishlist,
      showNotification,
    });
  };

  // --- INITIALIZATION & REAL-TIME SYNC ---
  useEffect(() => {
    const cleanupPromise = initializeAndSyncApp({
      currentUser,
      setIsSyncing,
      setUsers,
      setCredits,
      setWishlist,
      setActiveUserId,
      setCoasters,
      setIsInitialized,
      showNotification,
    });
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

  const mutationContext = {
    currentUser,
    activeUser,
    coasters,
    credits,
    wishlist,
    setCredits,
    setWishlist,
    showNotification,
    generateId,
    compressImage,
  };

  const userDataContext = {
    currentUser,
    activeUser,
    users,
    coasters,
    credits,
    wishlist,
    setUsers,
    setCoasters,
    setCredits,
    setWishlist,
    setIsSyncing,
    showNotification,
    generateId,
    compressImage,
    manualRefresh,
    switchUser,
  };

  const addUser = async (name: string, photo?: File, id?: string) => {
    return addUserAction(userDataContext, name, photo, id);
  };

  const updateUser = async (userId: string, newName: string, photo?: File) => {
      return updateUserAction(userDataContext, userId, newName, photo);
  };

  const saveHighScore = async (score: number) => {
      return saveHighScoreAction(userDataContext, score);
  };

  const updateRankings = async (rankings: RankingList) => {
      return updateRankingsAction(userDataContext, rankings);
  };

  const addCredit = async (coasterId: string, date: string, notes: string, restraints: string, photos: File[] = [], variant?: string) => {
    return addCreditDomainAction(mutationContext, coasterId, date, notes, restraints, photos, variant);
  };

  const updateCredit = async (creditId: string, date: string, notes: string, restraints: string, mainPhotoUrl: string | undefined, gallery: string[], newPhotos: File[] = [], variant?: string) => {
      return updateCreditDomainAction(mutationContext, creditId, date, notes, restraints, mainPhotoUrl, gallery, newPhotos, variant);
  };

  const deleteCredit = async (creditId: string) => {
    return deleteCreditDomainAction(mutationContext, creditId);
  };

  const addNewCoaster = async (coasterData: Omit<Coaster, 'id'>) => {
    return addNewCoasterDomainAction(mutationContext, coasterData);
  };

  const editCoaster = async (id: string, updates: Partial<Coaster>) => {
      return editCoasterDomainAction(mutationContext, id, updates);
  };

  const addMultipleCoasters = async (newCoasters: Omit<Coaster, 'id'>[]) => {
      return addMultipleCoastersDomainAction(mutationContext, newCoasters);
  };

  const searchOnlineCoaster = async (query: string) => {
      return await searchOnlineCoasterDomainAction(query);
  };

  const extractFromUrl = async (url: string) => {
      return await extractFromUrlDomainAction(url);
  };

  const generateIcon = async (prompt: string) => {
      return await generateIconDomainAction(prompt);
  };

  const addToWishlist = async (coasterId: string) => {
      return addToWishlistDomainAction(mutationContext, coasterId);
  };

  const removeFromWishlist = async (coasterId: string) => {
      return removeFromWishlistDomainAction(mutationContext, coasterId);
  };

  const isInWishlist = (coasterId: string) => {
      return isInWishlistForUserDomain(activeUser, wishlist, coasterId);
  };

  const enrichDatabaseImages = async () => {
      return enrichDatabaseImagesDomainAction(mutationContext, editCoaster);
  };

  const autoFetchCoasterImage = async (coasterId: string) => {
      return autoFetchCoasterImageDomainAction(coasters, coasterId);
  };

  const updateCoasterImage = async (coasterId: string, imageUrl: string) => {
      return updateCoasterImageDomainAction(coasterId, imageUrl);
  };

  const standardizeDatabase = async () => {
      return standardizeDatabaseAction(userDataContext);
  };

  const clearStoragePhotos = async () => {
      return clearStoragePhotosAction(userDataContext);
  };

  const importData = async (jsonData: any) => {
      return importDataAction(userDataContext, jsonData);
  };

  const exportData = () => {
    return exportDataAction(userDataContext);
  };

  const getLocalDataStats = async () => {
    return getLocalDataStatsAction();
  };

  const forceMigrateLocalData = async () => {
    return forceMigrateLocalDataAction(userDataContext);
  };

  const repairDatabase = async () => {
    return repairDatabaseAction(userDataContext);
  };

  const reconstructMissingProfiles = async () => {
    return reconstructMissingProfilesAction(userDataContext);
  };

  const nuclearReset = async () => {
    return nuclearResetAction(userDataContext);
  };

  const scanAllCredits = async () => {
    return scanAllCreditsAction(userDataContext);
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
