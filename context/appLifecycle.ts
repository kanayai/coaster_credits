import type { Dispatch, SetStateAction } from 'react';
import { INITIAL_COASTERS, INITIAL_USERS } from '../constants';
import { storage } from '../services/storage';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { loadOwnerData, upsertCoasters, upsertCredits, upsertUsers, upsertWishlist } from '../services/supabaseData';
import type { AppAuthUser } from '../services/authTypes';
import type { Coaster, Credit, User, WishlistEntry } from '../types';

type NotificationType = 'success' | 'error' | 'info';
type ShowNotification = (message: string, type?: NotificationType) => void;

interface AuthSubscriptionParams {
  setCurrentUser: Dispatch<SetStateAction<AppAuthUser | null>>;
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
  currentUser: AppAuthUser | null;
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

const toAppAuthUser = (input: { id?: string | null; email?: string | null } | null): AppAuthUser | null => {
  if (!input?.id) return null;
  return { uid: input.id, email: input.email ?? null };
};

const initializeLocalMode = async ({
  setUsers,
  setCoasters,
  setCredits,
  setWishlist,
  setActiveUserId,
  setIsInitialized,
  setIsSyncing,
}: Pick<
  InitializationParams,
  | 'setUsers'
  | 'setCoasters'
  | 'setCredits'
  | 'setWishlist'
  | 'setActiveUserId'
  | 'setIsInitialized'
  | 'setIsSyncing'
>) => {
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
};

export const subscribeToAuthState = ({ setCurrentUser, setIsAuthLoading }: AuthSubscriptionParams) => {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase is not configured. Running in local-only mode.');
    setCurrentUser(null);
    setIsAuthLoading(false);
    return () => {};
  }

  supabase.auth.getSession().then(({ data }) => {
    setCurrentUser(toAppAuthUser(data.session?.user ?? null));
    setIsAuthLoading(false);
  });

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setCurrentUser(toAppAuthUser(session?.user ?? null));
    setIsAuthLoading(false);
  });

  return () => subscription.unsubscribe();
};

export const signInWithGoogle = async (showNotification: ShowNotification) => {
  if (!isSupabaseConfigured || !supabase) {
    showNotification('Supabase is not configured in this environment.', 'error');
    return;
  }

  try {
    const redirectTo = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) throw error;
    showNotification('Opening Google sign-in...', 'info');
  } catch (error: any) {
    showNotification(error?.message || 'Failed to sign in with Supabase Google OAuth', 'error');
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
    if (supabase) {
      await supabase.auth.signOut();
    }

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
}: InitializationParams): Promise<void> => {
  try {
    await storage.migrateFromLocalStorage();

    if (!currentUser) {
      await initializeLocalMode({
        setUsers,
        setCoasters,
        setCredits,
        setWishlist,
        setActiveUserId,
        setIsInitialized,
        setIsSyncing,
      });
      return;
    }

    const uid = currentUser.uid;
    setIsSyncing(true);

    const localUsers = await storage.get<User[]>('cc_users');
    const localCoasters = await storage.get<Coaster[]>('cc_coasters');
    const localCredits = await storage.get<Credit[]>('cc_credits');
    const localWishlist = await storage.get<WishlistEntry[]>('cc_wishlist');

    const hasDataToMigrate =
      (localCoasters && localCoasters.length > 0) ||
      (localCredits && localCredits.length > 0) ||
      (localWishlist && localWishlist.length > 0) ||
      (localUsers && localUsers.length > 0);

    if (hasDataToMigrate) {
      try {
        showNotification('Syncing your local data to Supabase...', 'info');
        const usersToMigrate = (localUsers && localUsers.length > 0 ? localUsers : INITIAL_USERS).map((u) => ({
          ...u,
          ownerId: uid,
        }));
        const coastersToMigrate = (localCoasters || [])
          .filter((coaster) => coaster.isCustom)
          .map((coaster) => ({ ...coaster, isCustom: true }));
        const creditsToMigrate = (localCredits || []).map((credit) => ({ ...credit, ownerId: uid }));
        const wishlistToMigrate = (localWishlist || []).map((entry) => ({ ...entry, ownerId: uid }));

        await upsertUsers(usersToMigrate);
        await upsertCoasters(coastersToMigrate);
        await upsertCredits(creditsToMigrate);
        await upsertWishlist(wishlistToMigrate);

        await storage.set('cc_users', null);
        await storage.set('cc_coasters', null);
        await storage.set('cc_credits', null);
        await storage.set('cc_wishlist', null);
        onSyncSuccess();
        showNotification('Supabase sync complete!', 'success');
      } catch (err) {
        console.error('Supabase migration failed', err);
        onSyncError();
        showNotification(
          `Supabase sync encountered an issue. (${err instanceof Error ? err.message : String(err)})`,
          'error'
        );
      }
    }

    // Ensure required FK targets exist for cloud writes:
    // - base coaster catalog (credits.coaster_id FK)
    // - at least one owner-scoped app user (credits.user_id FK)
    await upsertCoasters(INITIAL_COASTERS.map((coaster) => ({ ...coaster, isCustom: Boolean(coaster.isCustom) })));

    const loaded = await loadOwnerData(uid);
    if (loaded.users.length === 0) {
      const defaultUsers = INITIAL_USERS.map((user) => ({ ...user, ownerId: uid }));
      await upsertUsers(defaultUsers);
      loaded.users = defaultUsers;
    }
    const loadedUsers = loaded.users;
    const localActiveId = await storage.get<string>('cc_active_user_id');

    setUsers(loadedUsers);
    const mergedCoastersById = new Map<string, Coaster>();
    for (const coaster of INITIAL_COASTERS) {
      mergedCoastersById.set(coaster.id, coaster);
    }
    for (const coaster of loaded.coasters) {
      mergedCoastersById.set(coaster.id, coaster);
    }
    setCoasters([...mergedCoastersById.values()]);
    setCredits(loaded.credits);
    setWishlist(loaded.wishlist);
    setActiveUserId(
      localActiveId && loadedUsers.some((u) => u.id === localActiveId)
        ? localActiveId
        : loadedUsers[0]?.id || INITIAL_USERS[0].id
    );

    setIsSyncing(false);
    setIsInitialized(true);
    onSyncSuccess();
  } catch (err) {
    console.error('Initialization failed', err);
    onSyncError();
    setIsSyncing(false);
    setIsInitialized(true);
  }
};
