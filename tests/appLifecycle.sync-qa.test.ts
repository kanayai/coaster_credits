import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockStorage = {
  migrateFromLocalStorage: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
};

const mockSignOut = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }));

const mockUpsertUsers = vi.fn();
const mockUpsertCoasters = vi.fn();
const mockUpsertCredits = vi.fn();
const mockUpsertWishlist = vi.fn();
const mockLoadOwnerData = vi.fn();

vi.mock('../services/storage', () => ({ storage: mockStorage }));
vi.mock('../services/supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      signOut: mockSignOut,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithOAuth: vi.fn(),
    },
  },
}));
vi.mock('../services/supabaseData', () => ({
  upsertUsers: mockUpsertUsers,
  upsertCoasters: mockUpsertCoasters,
  upsertCredits: mockUpsertCredits,
  upsertWishlist: mockUpsertWishlist,
  loadOwnerData: mockLoadOwnerData,
}));

describe('cloud sync QA: app lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage.migrateFromLocalStorage.mockResolvedValue(false);
    mockStorage.get.mockResolvedValue(null);
    mockStorage.set.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockLoadOwnerData.mockResolvedValue({ users: [], coasters: [], credits: [], wishlist: [] });
  });

  it('login init in local mode loads local data and active profile', async () => {
    const { initializeAndSyncApp } = await import('../context/appLifecycle');

    mockStorage.get.mockImplementation(async (key: string) => {
      if (key === 'cc_users') return [{ id: 'u_local', ownerId: 'local', name: 'Local Rider', avatarColor: 'bg-sky-500' }];
      if (key === 'cc_coasters') return [{ id: 'c_local', name: 'Local Coaster', park: 'Local Park', country: 'UK', type: 'Steel', manufacturer: 'Mack', isCustom: true }];
      if (key === 'cc_credits') return [{ id: 'cr_local', ownerId: 'local', userId: 'u_local', coasterId: 'c_local', date: '2026-04-11', rideCount: 1 }];
      if (key === 'cc_wishlist') return [{ id: 'w_local', ownerId: 'local', userId: 'u_local', coasterId: 'c_local', addedAt: '2026-04-11' }];
      if (key === 'cc_active_user_id') return 'u_local';
      return null;
    });

    const setUsers = vi.fn();
    const setCoasters = vi.fn();
    const setCredits = vi.fn();
    const setWishlist = vi.fn();
    const setActiveUserId = vi.fn();
    const setIsInitialized = vi.fn();
    const setIsSyncing = vi.fn();

    await initializeAndSyncApp({
      currentUser: null,
      setUsers,
      setCoasters,
      setCredits,
      setWishlist,
      setActiveUserId,
      setIsInitialized,
      setIsSyncing,
      showNotification: vi.fn(),
      onSyncSuccess: vi.fn(),
      onSyncError: vi.fn(),
    });

    expect(setUsers).toHaveBeenCalledWith([expect.objectContaining({ id: 'u_local', name: 'Local Rider' })]);
    expect(setActiveUserId).toHaveBeenCalledWith('u_local');
    expect(setIsInitialized).toHaveBeenCalledWith(true);
    expect(setIsSyncing).toHaveBeenLastCalledWith(false);
  });

  it('logout clears in-memory session and notifies user', async () => {
    const { logoutCurrentSession } = await import('../context/appLifecycle');

    const setActiveUserId = vi.fn();
    const setUsers = vi.fn();
    const setCredits = vi.fn();
    const setWishlist = vi.fn();
    const showNotification = vi.fn();

    await logoutCurrentSession({
      setActiveUserId,
      setUsers,
      setCredits,
      setWishlist,
      showNotification,
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(setActiveUserId).toHaveBeenCalledWith(null);
    expect(setUsers).toHaveBeenCalledWith([]);
    expect(setCredits).toHaveBeenCalledWith([]);
    expect(setWishlist).toHaveBeenCalledWith([]);
    expect(showNotification).toHaveBeenCalledWith('Signed out', 'info');
  });

  it('offline local data migrates to supabase and clears local cache', async () => {
    const { initializeAndSyncApp } = await import('../context/appLifecycle');

    mockStorage.get.mockImplementation(async (key: string) => {
      if (key === 'cc_users') return [{ id: 'u1', ownerId: 'local', name: 'Offline User', avatarColor: 'bg-emerald-500' }];
      if (key === 'cc_coasters') return [{ id: 'c1', name: 'Custom', park: 'Park', country: 'UK', type: 'Steel', manufacturer: 'B&M', isCustom: true }];
      if (key === 'cc_credits') return [{ id: 'cr1', ownerId: 'local', userId: 'u1', coasterId: 'c1', date: '2026-04-10', rideCount: 1 }];
      if (key === 'cc_wishlist') return [{ id: 'w1', ownerId: 'local', userId: 'u1', coasterId: 'c1', addedAt: '2026-04-10' }];
      if (key === 'cc_active_user_id') return 'u1';
      return null;
    });

    mockLoadOwnerData.mockResolvedValue({
      users: [{ id: 'u1', ownerId: 'uid-cloud', name: 'Offline User', avatarColor: 'bg-emerald-500' }],
      coasters: [{ id: 'c1', name: 'Custom', park: 'Park', country: 'UK', type: 'Steel', manufacturer: 'B&M', isCustom: true }],
      credits: [{ id: 'cr1', ownerId: 'uid-cloud', userId: 'u1', coasterId: 'c1', date: '2026-04-10', rideCount: 1 }],
      wishlist: [],
    });

    const showNotification = vi.fn();
    const setIsSyncing = vi.fn();

    await initializeAndSyncApp({
      currentUser: { uid: 'uid-cloud', email: 'a@b.com' },
      setUsers: vi.fn(),
      setCoasters: vi.fn(),
      setCredits: vi.fn(),
      setWishlist: vi.fn(),
      setActiveUserId: vi.fn(),
      setIsInitialized: vi.fn(),
      setIsSyncing,
      showNotification,
      onSyncSuccess: vi.fn(),
      onSyncError: vi.fn(),
    });

    expect(mockUpsertUsers).toHaveBeenCalled();
    expect(mockUpsertCoasters).toHaveBeenCalled();
    expect(mockUpsertCredits).toHaveBeenCalled();
    expect(mockUpsertWishlist).toHaveBeenCalled();
    expect(mockStorage.set).toHaveBeenCalledWith('cc_users', null);
    expect(mockStorage.set).toHaveBeenCalledWith('cc_coasters', null);
    expect(mockStorage.set).toHaveBeenCalledWith('cc_credits', null);
    expect(mockStorage.set).toHaveBeenCalledWith('cc_wishlist', null);
    expect(showNotification).toHaveBeenCalledWith('Supabase sync complete!', 'success');
    expect(setIsSyncing).toHaveBeenCalledWith(true);
    expect(setIsSyncing).toHaveBeenCalledWith(false);
  });

  it('load failure path exits syncing and surfaces sync error callback', async () => {
    const { initializeAndSyncApp } = await import('../context/appLifecycle');

    mockLoadOwnerData.mockRejectedValue(new Error('offline'));

    const setIsSyncing = vi.fn();
    const onSyncError = vi.fn();

    await initializeAndSyncApp({
      currentUser: { uid: 'uid-cloud', email: 'a@b.com' },
      setUsers: vi.fn(),
      setCoasters: vi.fn(),
      setCredits: vi.fn(),
      setWishlist: vi.fn(),
      setActiveUserId: vi.fn(),
      setIsInitialized: vi.fn(),
      setIsSyncing,
      showNotification: vi.fn(),
      onSyncSuccess: vi.fn(),
      onSyncError,
    });

    expect(onSyncError).toHaveBeenCalled();
    expect(setIsSyncing).toHaveBeenCalledWith(false);
  });
});
