import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockStorage = {
  get: vi.fn(),
  set: vi.fn(),
};

const mockUpsertUsers = vi.fn();
const mockUpsertCoasters = vi.fn();
const mockUpsertCredits = vi.fn();
const mockUpsertWishlist = vi.fn();

vi.mock('../services/storage', () => ({ storage: mockStorage }));
vi.mock('../services/supabaseData', () => ({
  upsertUsers: mockUpsertUsers,
  upsertCoasters: mockUpsertCoasters,
  upsertCredits: mockUpsertCredits,
  upsertWishlist: mockUpsertWishlist,
  updateUser: vi.fn(),
  updateCredit: vi.fn(),
  loadOwnerData: vi.fn(),
}));

describe('cloud sync QA: migration conflict handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage.set.mockResolvedValue(undefined);

    mockStorage.get.mockImplementation(async (key: string) => {
      if (key === 'cc_users') {
        return [{ id: 'u_conflict', ownerId: 'local', name: 'Conflict User', avatarColor: 'bg-slate-500' }];
      }
      if (key === 'cc_coasters') return [];
      if (key === 'cc_credits') return [];
      if (key === 'cc_wishlist') return [];
      return null;
    });
  });

  it('migrates local entities to supabase and completes flow', async () => {
    const { forceMigrateLocalDataAction } = await import('../context/dataManagement');

    const showNotification = vi.fn();
    const manualRefresh = vi.fn();
    const setIsSyncing = vi.fn();

    await forceMigrateLocalDataAction({
      currentUser: { uid: 'uid-current' } as any,
      setIsSyncing,
      showNotification,
      manualRefresh,
    });

    expect(mockUpsertUsers).toHaveBeenCalledTimes(1);
    expect(mockUpsertCoasters).toHaveBeenCalledTimes(1);
    expect(mockUpsertCredits).toHaveBeenCalledTimes(1);
    expect(mockUpsertWishlist).toHaveBeenCalledTimes(1);
    expect(showNotification).toHaveBeenCalledWith('Manual Supabase migration successful!', 'success');
    expect(manualRefresh).toHaveBeenCalledTimes(1);
    expect(setIsSyncing).toHaveBeenNthCalledWith(1, true);
    expect(setIsSyncing).toHaveBeenLastCalledWith(false);
  });
});
