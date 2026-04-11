import type { Dispatch, SetStateAction } from 'react';
import { INITIAL_COASTERS, INITIAL_USERS } from '../constants';
import {
  auth,
  collection,
  db,
  doc,
  FirebaseUser,
  googleProvider,
  handleFirestoreError,
  onAuthStateChanged,
  onSnapshot,
  OperationType,
  query,
  setDoc,
  signInWithPopup,
  signOut,
  cleanForFirestore,
  isValidFirestoreDocId,
  isValidFirestoreOwnerId,
  where,
  writeBatch,
} from '../firebase';
import { storage } from '../services/storage';
import type { Coaster, Credit, User, WishlistEntry } from '../types';

type NotificationType = 'success' | 'error' | 'info';
type ShowNotification = (message: string, type?: NotificationType) => void;

interface AuthSubscriptionParams {
  setCurrentUser: Dispatch<SetStateAction<FirebaseUser | null>>;
  setIsAuthLoading: Dispatch<SetStateAction<boolean>>;
}

interface LogoutParams {
  setActiveUserId: Dispatch<SetStateAction<string | null>>;
  setUsers: Dispatch<SetStateAction<User[]>>;
  setCredits: Dispatch<SetStateAction<Credit[]>>;
  setWishlist: Dispatch<SetStateAction<WishlistEntry[]>>;
  showNotification: ShowNotification;
}

interface InitializationParams {
  currentUser: FirebaseUser | null;
  setIsSyncing: Dispatch<SetStateAction<boolean>>;
  setUsers: Dispatch<SetStateAction<User[]>>;
  setCredits: Dispatch<SetStateAction<Credit[]>>;
  setWishlist: Dispatch<SetStateAction<WishlistEntry[]>>;
  setActiveUserId: Dispatch<SetStateAction<string | null>>;
  setCoasters: Dispatch<SetStateAction<Coaster[]>>;
  setIsInitialized: Dispatch<SetStateAction<boolean>>;
  showNotification: ShowNotification;
  onSyncSuccess: () => void;
  onSyncError: () => void;
}

export const subscribeToAuthState = ({
  setCurrentUser,
  setIsAuthLoading,
}: AuthSubscriptionParams) => {
  return onAuthStateChanged(auth, (user) => {
    setCurrentUser(user);
    setIsAuthLoading(false);
  });
};

export const signInWithGoogle = async (showNotification: ShowNotification) => {
  try {
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, googleProvider);
    showNotification('Signed in successfully!', 'success');
  } catch (error: any) {
    console.error('Sign in error', error);

    let message = 'Failed to sign in';
    if (error.code === 'auth/unauthorized-domain') {
      message = 'Domain not authorized in Firebase. Please add this domain to your Firebase Console.';
    } else if (error.code === 'auth/network-request-failed') {
      message = 'Network error: Please check your internet connection or disable ad-blockers/firewalls.';
    } else if (error.code === 'auth/popup-blocked') {
      message = 'Sign-in popup was blocked by your browser.';
    } else if (error.code === 'auth/popup-closed-by-user') {
      message = 'Sign-in window was closed before completion.';
    } else if (error.message) {
      message = `Sign-in error: ${error.message}`;
    }

    showNotification(message, 'error');
  }
};

export const logoutCurrentSession = async ({
  setActiveUserId,
  setUsers,
  setCredits,
  setWishlist,
  showNotification,
}: LogoutParams) => {
  try {
    await signOut(auth);
    setActiveUserId(null);
    setUsers([]);
    setCredits([]);
    setWishlist([]);
    showNotification('Signed out', 'info');
  } catch (error) {
    console.error('Logout error', error);
  }
};

export const initializeAndSyncApp = async ({
  currentUser,
  setIsSyncing,
  setUsers,
  setCredits,
  setWishlist,
  setActiveUserId,
  setCoasters,
  setIsInitialized,
  showNotification,
  onSyncSuccess,
  onSyncError,
}: InitializationParams): Promise<(() => void) | void> => {
  try {
    await storage.migrateFromLocalStorage();

    if (!currentUser) {
      const localUsers = await storage.get<User[]>('cc_users');
      const localCoasters = await storage.get<Coaster[]>('cc_coasters');
      const localCredits = await storage.get<Credit[]>('cc_credits');
      const localWishlist = await storage.get<WishlistEntry[]>('cc_wishlist');
      const localActiveId = await storage.get<string>('cc_active_user_id');

      setUsers(localUsers && localUsers.length > 0 ? localUsers : INITIAL_USERS);
      setCoasters([...INITIAL_COASTERS, ...(localCoasters || [])]);
      setCredits(localCredits || []);
      setWishlist(localWishlist || []);
      setActiveUserId(
        localActiveId || (localUsers && localUsers.length > 0 ? localUsers[0].id : INITIAL_USERS[0].id)
      );

      setIsInitialized(true);
      setIsSyncing(false);
      return;
    }

    const uid = currentUser.uid;
    if (!isValidFirestoreOwnerId(uid)) {
      setIsSyncing(false);
      setIsInitialized(true);
      onSyncError();
      showNotification('Unable to sync cloud data due to invalid account state.', 'error');
      return;
    }
    setIsSyncing(true);

    const localUsers = await storage.get<User[]>('cc_users');
    const localCoasters = await storage.get<Coaster[]>('cc_coasters');
    const localCredits = await storage.get<Credit[]>('cc_credits');
    const localWishlist = await storage.get<WishlistEntry[]>('cc_wishlist');

    const usersToMigrate = localUsers || INITIAL_USERS;
    const hasDataToMigrate =
      (localCoasters && localCoasters.length > 0) ||
      (localCredits && localCredits.length > 0) ||
      (localWishlist && localWishlist.length > 0) ||
      (localUsers && localUsers.length > 0);

    if (hasDataToMigrate) {
      showNotification('Syncing your local data to the cloud...', 'info');
      const batch = writeBatch(db);

      for (const user of usersToMigrate) {
        if (!isValidFirestoreDocId(user.id)) continue;
        const userRef = doc(db, 'users', user.id);
        batch.set(userRef, cleanForFirestore({ ...user, ownerId: uid }));
      }

      if (localCoasters) {
        for (const coaster of localCoasters) {
          if (!coaster.isCustom || !isValidFirestoreDocId(coaster.id)) continue;
          const coasterRef = doc(db, 'coasters', coaster.id);
          batch.set(coasterRef, cleanForFirestore(coaster));
        }
      }

      if (localCredits) {
        for (const credit of localCredits) {
          if (!isValidFirestoreDocId(credit.id)) continue;
          const creditRef = doc(db, 'credits', credit.id);
          batch.set(creditRef, cleanForFirestore({ ...credit, ownerId: uid }));
        }
      }

      if (localWishlist) {
        for (const wishlistEntry of localWishlist) {
          if (!isValidFirestoreDocId(wishlistEntry.id)) continue;
          const wishlistRef = doc(db, 'wishlist', wishlistEntry.id);
          batch.set(wishlistRef, cleanForFirestore({ ...wishlistEntry, ownerId: uid }));
        }
      }

      try {
        await batch.commit();
        await storage.set('cc_users', null);
        await storage.set('cc_coasters', null);
        await storage.set('cc_credits', null);
        await storage.set('cc_wishlist', null);
        onSyncSuccess();
        showNotification('Cloud sync complete!', 'success');
      } catch (err) {
        console.error('Migration failed', err);
        onSyncError();
        showNotification('Cloud sync encountered an issue. Some data might not be synced yet.', 'error');
      }
    }

    const qUsers = query(collection(db, 'users'), where('ownerId', '==', uid));
    const unsubUsers = onSnapshot(
      qUsers,
      (snapshot) => {
        const loadedUsers = snapshot.docs.map((docSnapshot) => docSnapshot.data() as User);
        if (loadedUsers.length > 0) {
          setUsers(loadedUsers);
          storage.get<string>('cc_active_user_id').then((id) => {
            if (id && loadedUsers.some((user) => user.id === id)) {
              setActiveUserId(id);
            } else {
              setActiveUserId(loadedUsers[0].id);
            }
          });
        } else {
          setUsers(INITIAL_USERS);
          setActiveUserId(INITIAL_USERS[0].id);
        }
        onSyncSuccess();
        setIsSyncing(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'users');
        onSyncError();
        setIsSyncing(false);
      }
    );

    const unsubCoasters = onSnapshot(
      collection(db, 'coasters'),
      (snapshot) => {
        const loadedCoasters = snapshot.docs.map((docSnapshot) => docSnapshot.data() as Coaster);
        const customOnes = loadedCoasters.filter((coaster) => coaster.isCustom);
        setCoasters([...INITIAL_COASTERS, ...customOnes]);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'coasters')
    );

    const qCredits = query(collection(db, 'credits'), where('ownerId', '==', uid));
    const unsubCredits = onSnapshot(
      qCredits,
      (snapshot) => {
        setCredits(snapshot.docs.map((docSnapshot) => docSnapshot.data() as Credit));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'credits')
    );

    const qWishlist = query(collection(db, 'wishlist'), where('ownerId', '==', uid));
    const unsubWishlist = onSnapshot(
      qWishlist,
      (snapshot) => {
        setWishlist(snapshot.docs.map((docSnapshot) => docSnapshot.data() as WishlistEntry));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'wishlist')
    );

    setIsInitialized(true);

    setTimeout(() => setIsSyncing(false), 5000);

    return () => {
      unsubUsers();
      unsubCoasters();
      unsubCredits();
      unsubWishlist();
    };
  } catch (err) {
    console.error('Initialization failed', err);
    onSyncError();
    setIsSyncing(false);
    setIsInitialized(true);
    return () => {};
  }
};
