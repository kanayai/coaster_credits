
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Coaster, Credit, ViewState, WishlistEntry, RankingList } from '../types';
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
  addNewCoaster: (coaster: Omit<Coaster, 'id'>) => Promise<Coaster>;
  addMultipleCoasters: (coasters: Omit<Coaster, 'id'>[]) => Promise<void>;
  searchOnlineCoaster: (query: string) => Promise<Partial<Coaster>[] | null>;
  generateIcon: (prompt: string) => Promise<string | null>;
  changeView: (view: ViewState) => void;
  setCoasterListViewMode: (mode: 'CREDITS' | 'WISHLIST') => void;
  deleteCredit: (creditId: string) => void;
  setLastSearchQuery: (query: string) => void;
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
  
  // Ranking Actions
  updateRankings: (rankings: RankingList) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const generateId = (prefix: string) => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substr(2, 9);
  return `${prefix}_${timestamp}_${randomPart}`;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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

  useEffect(() => localStorage.setItem('cc_users', JSON.stringify(users)), [users]);
  useEffect(() => localStorage.setItem('cc_coasters', JSON.stringify(coasters)), [coasters]);
  useEffect(() => localStorage.setItem('cc_credits', JSON.stringify(credits)), [credits]);
  useEffect(() => localStorage.setItem('cc_wishlist', JSON.stringify(wishlist)), [wishlist]);
  useEffect(() => localStorage.setItem('cc_active_user_id', activeUser.id), [activeUser]);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ id: generateId('notif'), message, type });
    setTimeout(() => {
        setNotification(prev => (prev && prev.message === message ? null : prev));
    }, 4000);
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
          avatarUrl,
          rankings: { steel: [], wooden: [] }
        };
        setUsers(prev => [...prev, newUser]);
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

  const addCredit = (coasterId: string, date: string, notes: string, restraints: string, photo?: File) => {
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
    setCredits(prev => [...prev, newCredit]);
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
      processUpdate(); 
    }
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
        park: cleanName(coasterData.park),
        country: cleanName(coasterData.country),
        manufacturer: normalizeManufacturer(coasterData.manufacturer),
        id: newId, 
        imageUrl: finalImageUrl 
    };
    setCoasters(prev => [...prev, newCoaster]);
    showNotification("Added to Database", 'success');
    return newCoaster;
  };

  const addMultipleCoasters = async (coasterItems: Omit<Coaster, 'id'>[]) => {
      const newCoasters: Coaster[] = [];
      for (const item of coasterItems) {
          const newId = generateId('c');
          // Standardize basic fields
          const newCoaster: Coaster = {
              ...item,
              id: newId,
              park: cleanName(item.park),
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
                      const normPark = cleanName(newC.park).toLowerCase();
                      const existing = nextCoasters.find(c => 
                        c.id === newC.id || (cleanName(c.name).toLowerCase() === normName && cleanName(c.park).toLowerCase() === normPark)
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
    const normalizedCoasters = coasters.map(c => ({
        ...c,
        name: cleanName(c.name),
        park: cleanName(c.park),
        manufacturer: normalizeManufacturer(c.manufacturer)
    }));
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

    if (mergedCount > 0) {
        setCredits(prev => prev.map(cr => idTranslationTable[cr.coasterId] ? { ...cr, coasterId: idTranslationTable[cr.coasterId] } : cr));
        setCoasters(deduplicatedCoasters);
        showNotification(`Merged ${mergedCount} duplicates.`, 'success');
    }
  };

  return (
    <AppContext.Provider value={{
      activeUser, users, coasters, credits, wishlist, currentView, coasterListViewMode, notification, lastSearchQuery,
      switchUser, addUser, updateUser, addCredit, updateCredit, addNewCoaster, addMultipleCoasters, searchOnlineCoaster, generateIcon,
      changeView, setCoasterListViewMode, deleteCredit, addToWishlist, removeFromWishlist, isInWishlist,
      showNotification, hideNotification, setLastSearchQuery, enrichDatabaseImages, updateCoasterImage, autoFetchCoasterImage,
      importData, standardizeDatabase, updateRankings
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
