
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Coaster, Credit, ViewState, WishlistEntry } from '../types';
import { INITIAL_COASTERS, INITIAL_USERS, normalizeManufacturer, cleanName } from '../constants';
import { generateCoasterInfo, generateAppIcon } from '../services/geminiService';
import { fetchCoasterImageFromWiki } from '../services/wikipediaService';

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
  
  // Actions
  switchUser: (userId: string) => void;
  addUser: (name: string, photo?: File) => void;
  updateUser: (userId: string, newName: string, photo?: File) => void;
  addCredit: (coasterId: string, date: string, notes: string, restraints: string, photo?: File) => void;
  updateCredit: (creditId: string, date: string, notes: string, restraints: string, photo?: File) => void;
  addNewCoaster: (coaster: Omit<Coaster, 'id'>) => Promise<string>;
  searchOnlineCoaster: (query: string) => Promise<Partial<Coaster> | null>;
  generateIcon: (prompt: string) => Promise<string | null>;
  changeView: (view: ViewState) => void;
  setCoasterListViewMode: (mode: 'CREDITS' | 'WISHLIST') => void;
  deleteCredit: (creditId: string) => void;
  
  // Search State Action
  setLastSearchQuery: (query: string) => void;

  // Wishlist Actions
  addToWishlist: (coasterId: string) => void;
  removeFromWishlist: (coasterId: string) => void;
  isInWishlist: (coasterId: string) => boolean;
  
  // Notification
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideNotification: () => void;

  // Image Actions
  enrichDatabaseImages: () => Promise<void>;
  updateCoasterImage: (coasterId: string, imageUrl: string) => void;
  autoFetchCoasterImage: (coasterId: string) => Promise<string | null>;

  // Data Management
  importData: (jsonData: any) => void;
  standardizeDatabase: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Robust ID generation
const generateId = (prefix: string) => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substr(2, 9);
  return `${prefix}_${timestamp}_${randomPart}`;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load initial state from local storage or defaults
  const [users, setUsers] = useState<User[]>(() => {
    const stored = localStorage.getItem('cc_users');
    return stored ? JSON.parse(stored) : INITIAL_USERS;
  });

  const [activeUser, setActiveUser] = useState<User>(() => {
    const storedId = localStorage.getItem('cc_active_user_id');
    const storedUsers = localStorage.getItem('cc_users');
    const parsedUsers = storedUsers ? JSON.parse(storedUsers) : INITIAL_USERS;
    return parsedUsers.find((u: User) => u.id === storedId) || parsedUsers[0];
  });

  const [coasters, setCoasters] = useState<Coaster[]>(() => {
    const stored = localStorage.getItem('cc_coasters');
    return stored ? JSON.parse(stored) : INITIAL_COASTERS;
  });

  const [credits, setCredits] = useState<Credit[]>(() => {
    const stored = localStorage.getItem('cc_credits');
    return stored ? JSON.parse(stored) : [];
  });

  const [wishlist, setWishlist] = useState<WishlistEntry[]>(() => {
    const stored = localStorage.getItem('cc_wishlist');
    return stored ? JSON.parse(stored) : [];
  });

  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [coasterListViewMode, setCoasterListViewMode] = useState<'CREDITS' | 'WISHLIST'>('CREDITS');
  const [notification, setNotification] = useState<Notification | null>(null);
  const [lastSearchQuery, setLastSearchQuery] = useState('');

  // Persistence Effects
  useEffect(() => localStorage.setItem('cc_users', JSON.stringify(users)), [users]);
  useEffect(() => localStorage.setItem('cc_coasters', JSON.stringify(coasters)), [coasters]);
  useEffect(() => localStorage.setItem('cc_credits', JSON.stringify(credits)), [credits]);
  useEffect(() => localStorage.setItem('cc_wishlist', JSON.stringify(wishlist)), [wishlist]);
  useEffect(() => localStorage.setItem('cc_active_user_id', activeUser.id), [activeUser]);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ id: generateId('notif'), message, type });
    // Auto-hide after 3 seconds
    setTimeout(() => {
        setNotification(prev => (prev && prev.message === message ? null : prev));
    }, 3000);
  };

  const hideNotification = () => setNotification(null);

  const switchUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
        setActiveUser(user);
        showNotification(`Welcome back, ${user.name}!`);
    }
  };

  const addUser = (name: string, photo?: File) => {
    const processUser = (avatarUrl?: string) => {
        const newUser: User = {
          id: generateId('u'),
          name,
          avatarColor: ['bg-red-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'][Math.floor(Math.random() * 6)],
          avatarUrl
        };
        setUsers([...users, newUser]);
        setActiveUser(newUser);
        showNotification(`Profile "${name}" created!`, 'success');
    };

    if (photo) {
        const reader = new FileReader();
        reader.onloadend = () => processUser(reader.result as string);
        reader.readAsDataURL(photo);
    } else {
        processUser();
    }
  };

  const updateUser = (userId: string, newName: string, photo?: File) => {
    const processUpdate = (avatarUrl?: string) => {
        setUsers(prevUsers => prevUsers.map(u => 
          u.id === userId ? { ...u, name: newName, ...(avatarUrl ? { avatarUrl } : {}) } : u
        ));
        if (activeUser.id === userId) {
          setActiveUser(prev => ({ ...prev, name: newName, ...(avatarUrl ? { avatarUrl } : {}) }));
        }
        showNotification("Profile updated", 'success');
    };

    if (photo) {
        const reader = new FileReader();
        reader.onloadend = () => processUpdate(reader.result as string);
        reader.readAsDataURL(photo);
    } else {
        processUpdate();
    }
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
    setWishlist([...wishlist, entry]);
    showNotification("Added to Bucket List", 'success');
  };

  const removeFromWishlist = (coasterId: string) => {
    setWishlist(prev => prev.filter(w => !(w.userId === activeUser.id && w.coasterId === coasterId)));
    showNotification("Removed from Bucket List", 'info');
  };

  const isInWishlist = (coasterId: string) => {
    return wishlist.some(w => w.userId === activeUser.id && w.coasterId === coasterId);
  };

  const addCredit = (coasterId: string, date: string, notes: string, restraints: string, photo?: File) => {
    // If it's in the wishlist, remove it (Bucket list achieved!)
    if (isInWishlist(coasterId)) {
      setWishlist(prev => prev.filter(w => !(w.userId === activeUser.id && w.coasterId === coasterId)));
    }

    if (photo) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            saveCredit(coasterId, date, notes, restraints, base64);
        };
        reader.readAsDataURL(photo);
    } else {
        saveCredit(coasterId, date, notes, restraints);
    }
  };

  const saveCredit = (coasterId: string, date: string, notes: string, restraints: string, photoUrl?: string) => {
      const newCredit: Credit = {
      id: generateId('cr'),
      userId: activeUser.id,
      coasterId,
      date,
      rideCount: 1, 
      notes,
      restraints,
      photoUrl
    };
    setCredits([...credits, newCredit]);
    showNotification("Ride Logged Successfully!", 'success');
  };

  const updateCredit = (creditId: string, date: string, notes: string, restraints: string, photo?: File) => {
    const processUpdate = (photoUrl?: string) => {
      setCredits(prev => prev.map(c => {
        if (c.id === creditId) {
          return {
            ...c,
            date,
            notes,
            restraints,
            // Only update photoUrl if a new one is processed (photoUrl is passed as string)
            // If it is undefined, we keep the existing one (spread c first)
            ...(photoUrl !== undefined ? { photoUrl } : {})
          };
        }
        return c;
      }));
      showNotification("Entry updated successfully", 'success');
    };

    if (photo) {
      const reader = new FileReader();
      reader.onloadend = () => {
        processUpdate(reader.result as string);
      };
      reader.readAsDataURL(photo);
    } else {
      processUpdate(); // Update text fields only
    }
  };

  const addNewCoaster = async (coasterData: Omit<Coaster, 'id'>): Promise<string> => {
    const newId = generateId('c');
    
    // Attempt to get a real image immediately upon creation if one wasn't provided or is a placeholder
    let finalImageUrl = coasterData.imageUrl;
    if (!finalImageUrl || finalImageUrl.includes('picsum')) {
       const wikiImage = await fetchCoasterImageFromWiki(coasterData.name, coasterData.park);
       if (wikiImage) finalImageUrl = wikiImage;
    }

    // Normalize manufacturer & Clean Names (Remove accents from Park/Country)
    const normalizedManufacturer = normalizeManufacturer(coasterData.manufacturer);
    const cleanedPark = cleanName(coasterData.park);
    const cleanedCountry = cleanName(coasterData.country);

    const newCoaster: Coaster = { 
        ...coasterData, 
        park: cleanedPark,
        country: cleanedCountry,
        manufacturer: normalizedManufacturer,
        id: newId, 
        imageUrl: finalImageUrl 
    };
    setCoasters([...coasters, newCoaster]);
    showNotification("New Coaster Added to Database", 'success');
    return newId;
  };

  const searchOnlineCoaster = async (query: string) => {
    return await generateCoasterInfo(query);
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
      
      // Filter coasters that have picsum placeholders or no image
      const targets = coasters.filter(c => !c.imageUrl || c.imageUrl.includes('picsum'));
      let updatedCount = 0;
      
      console.log(`Starting enrichment for ${targets.length} coasters`);

      // Batch process to be polite but faster
      const BATCH_SIZE = 5;
      
      for (let i = 0; i < targets.length; i += BATCH_SIZE) {
          const batch = targets.slice(i, i + BATCH_SIZE);
          
          const results = await Promise.all(
              batch.map(async (coaster) => {
                  const url = await fetchCoasterImageFromWiki(coaster.name, coaster.park);
                  return { id: coaster.id, url };
              })
          );

          // Apply batch updates
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
          
          // Small delay between batches to be nice to API
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
          // 1. Import Coasters (preserve custom ones)
          if (jsonData.coasters && Array.isArray(jsonData.coasters)) {
              setCoasters(prev => {
                  const existingIds = new Set(prev.map(c => c.id));
                  const newCoasters = jsonData.coasters.filter((c: Coaster) => !existingIds.has(c.id));
                  return [...prev, ...newCoasters];
              });
          }

          // 2. Import Credits
          // We import credits and assign them to the CURRENT ACTIVE USER to make it useful for moving data
          if (jsonData.credits && Array.isArray(jsonData.credits)) {
              setCredits(prev => {
                  const existingIds = new Set(prev.map(c => c.id));
                  const toAdd = jsonData.credits
                    .filter((c: Credit) => !existingIds.has(c.id))
                    .map((c: Credit) => ({...c, userId: activeUser.id})); // Remap to current user
                  
                  return [...prev, ...toAdd];
              });
          }

          // 3. Import Wishlist
          if (jsonData.wishlist && Array.isArray(jsonData.wishlist)) {
              setWishlist(prev => {
                  const existingIds = new Set(prev.map(w => w.id));
                  const toAdd = jsonData.wishlist
                    .filter((w: WishlistEntry) => !existingIds.has(w.id))
                    .map((w: WishlistEntry) => ({...w, userId: activeUser.id})); // Remap to current user

                  return [...prev, ...toAdd];
              });
          }
          
          showNotification("Database imported successfully!", 'success');
      } catch (e) {
          console.error(e);
          showNotification("Failed to import data. Invalid format.", 'error');
      }
  };

  const standardizeDatabase = () => {
    let changedCount = 0;
    
    setCoasters(prev => prev.map(c => {
      const normalizedMfg = normalizeManufacturer(c.manufacturer);
      // Clean and remove accents from Park and Country to ensure grouping works
      const cleanedPark = cleanName(c.park);
      const cleanedCountry = cleanName(c.country);
      
      if (
        normalizedMfg !== c.manufacturer || 
        cleanedPark !== c.park || 
        cleanedCountry !== c.country
      ) {
        changedCount++;
        return {
          ...c,
          manufacturer: normalizedMfg,
          park: cleanedPark,
          country: cleanedCountry
        };
      }
      return c;
    }));

    if (changedCount > 0) {
      showNotification(`Standardized ${changedCount} entries (Merged accented names, etc).`, 'success');
    } else {
      showNotification("Database is already standardized.", 'info');
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
      coasterListViewMode,
      notification,
      lastSearchQuery,
      switchUser,
      addUser,
      updateUser,
      addCredit,
      updateCredit,
      addNewCoaster,
      searchOnlineCoaster,
      generateIcon,
      changeView,
      setCoasterListViewMode,
      deleteCredit,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      showNotification,
      hideNotification,
      setLastSearchQuery,
      enrichDatabaseImages,
      updateCoasterImage,
      autoFetchCoasterImage,
      importData,
      standardizeDatabase
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
