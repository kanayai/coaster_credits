import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Coaster, Credit, ViewState, WishlistEntry } from '../types';
import { INITIAL_COASTERS, INITIAL_USERS } from '../constants';
import { generateCoasterInfo } from '../services/geminiService';

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
  
  // Actions
  switchUser: (userId: string) => void;
  addUser: (name: string) => void;
  updateUserName: (userId: string, newName: string) => void;
  addCredit: (coasterId: string, date: string, notes: string, photo?: File) => void;
  updateCredit: (creditId: string, date: string, notes: string, photo?: File) => void;
  addNewCoaster: (coaster: Omit<Coaster, 'id'>) => Promise<string>;
  searchOnlineCoaster: (query: string) => Promise<Partial<Coaster> | null>;
  changeView: (view: ViewState) => void;
  setCoasterListViewMode: (mode: 'CREDITS' | 'WISHLIST') => void;
  deleteCredit: (creditId: string) => void;
  
  // Wishlist Actions
  addToWishlist: (coasterId: string) => void;
  removeFromWishlist: (coasterId: string) => void;
  isInWishlist: (coasterId: string) => boolean;
  
  // Notification
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideNotification: () => void;
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

  const addUser = (name: string) => {
    const newUser: User = {
      id: generateId('u'),
      name,
      avatarColor: ['bg-red-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'][Math.floor(Math.random() * 6)]
    };
    setUsers([...users, newUser]);
    setActiveUser(newUser);
    showNotification(`Profile "${name}" created!`, 'success');
  };

  const updateUserName = (userId: string, newName: string) => {
    setUsers(prevUsers => prevUsers.map(u => 
      u.id === userId ? { ...u, name: newName } : u
    ));
    if (activeUser.id === userId) {
      setActiveUser(prev => ({ ...prev, name: newName }));
    }
    showNotification("Profile updated", 'success');
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

  const addCredit = (coasterId: string, date: string, notes: string, photo?: File) => {
    // If it's in the wishlist, remove it (Bucket list achieved!)
    if (isInWishlist(coasterId)) {
      setWishlist(prev => prev.filter(w => !(w.userId === activeUser.id && w.coasterId === coasterId)));
    }

    if (photo) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            saveCredit(coasterId, date, notes, base64);
        };
        reader.readAsDataURL(photo);
    } else {
        saveCredit(coasterId, date, notes);
    }
  };

  const saveCredit = (coasterId: string, date: string, notes: string, photoUrl?: string) => {
      const newCredit: Credit = {
      id: generateId('cr'),
      userId: activeUser.id,
      coasterId,
      date,
      rideCount: 1, 
      notes,
      photoUrl
    };
    setCredits([...credits, newCredit]);
    showNotification("Ride Logged Successfully!", 'success');
    setCurrentView('DASHBOARD');
  };

  const updateCredit = (creditId: string, date: string, notes: string, photo?: File) => {
    const processUpdate = (photoUrl?: string) => {
      setCredits(prev => prev.map(c => {
        if (c.id === creditId) {
          return {
            ...c,
            date,
            notes,
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
    const newCoaster: Coaster = { ...coasterData, id: newId };
    setCoasters([...coasters, newCoaster]);
    showNotification("New Coaster Added to Database", 'success');
    return newId;
  };

  const searchOnlineCoaster = async (query: string) => {
    return await generateCoasterInfo(query);
  };

  const deleteCredit = (creditId: string) => {
    setCredits(prev => prev.filter(c => c.id !== creditId));
    showNotification("Credit deleted", 'info');
  }

  const changeView = (view: ViewState) => setCurrentView(view);

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
      switchUser,
      addUser,
      updateUserName,
      addCredit,
      updateCredit,
      addNewCoaster,
      searchOnlineCoaster,
      changeView,
      setCoasterListViewMode,
      deleteCredit,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      showNotification,
      hideNotification
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