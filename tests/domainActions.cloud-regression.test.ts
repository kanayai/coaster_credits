import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockUpdateCredit = vi.fn();
const mockUpsertCredits = vi.fn();
const mockUpsertWishlist = vi.fn();
const mockDeleteById = vi.fn();

vi.mock('../services/supabaseData', () => ({
  updateCredit: mockUpdateCredit,
  updateCoaster: vi.fn(),
  upsertCoasters: vi.fn(),
  upsertCredits: mockUpsertCredits,
  upsertWishlist: mockUpsertWishlist,
  deleteById: mockDeleteById,
}));

vi.mock('../services/storage', () => ({
  storage: {
    set: vi.fn(),
  },
}));

vi.mock('../services/geminiService', () => ({
  generateAppIcon: vi.fn(),
  generateCoasterInfo: vi.fn(),
  extractCoasterFromUrl: vi.fn(),
}));

vi.mock('../services/wikipediaService', () => ({
  fetchCoasterImageFromWiki: vi.fn(),
}));

describe('updateCreditAction cloud writes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends update payload through supabase adapter', async () => {
    const { updateCreditAction } = await import('../context/domainActions');

    const context = {
      activeUser: null,
      compressImage: vi.fn(),
      credits: [],
      currentUser: { uid: 'uid-123' },
      generateId: vi.fn(),
      setCoasters: vi.fn(),
      setCredits: vi.fn(),
      setWishlist: vi.fn(),
      showNotification: vi.fn(),
      coasters: [],
      wishlist: [],
    } as any;

    await updateCreditAction(
      context,
      'cr1',
      '2026-04-10',
      'Great ride',
      'Lap bar',
      undefined,
      [],
      [],
      undefined
    );

    expect(mockUpdateCredit).toHaveBeenCalledTimes(1);
    expect(mockUpdateCredit).toHaveBeenCalledWith(
      'cr1',
      expect.objectContaining({
        date: '2026-04-10',
        notes: 'Great ride',
        restraints: 'Lap bar',
        gallery: [],
      })
    );
  });

  it('adds a cloud credit and removes matching wishlist entry in memory', async () => {
    const { addCreditAction } = await import('../context/domainActions');

    const setCredits = vi.fn();
    const setWishlist = vi.fn();
    const showNotification = vi.fn();

    const context = {
      activeUser: { id: 'u1' },
      compressImage: vi.fn().mockResolvedValue('data:image/mock'),
      credits: [],
      currentUser: { uid: 'uid-123' },
      generateId: vi.fn().mockReturnValue('cr-new'),
      setCoasters: vi.fn(),
      setCredits,
      setWishlist,
      showNotification,
      coasters: [],
      wishlist: [{ id: 'w1', userId: 'u1', ownerId: 'uid-123', coasterId: 'c1', addedAt: '2026-04-10' }],
    } as any;

    await addCreditAction(context, 'c1', '2026-04-11', 'Great', 'Lap bar', []);

    expect(mockUpsertCredits).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'cr-new',
        coasterId: 'c1',
        ownerId: 'uid-123',
        userId: 'u1',
      }),
    ]);
    expect(mockDeleteById).toHaveBeenCalledWith('wishlist', 'w1');
    expect(setCredits).toHaveBeenCalledTimes(1);
    expect(setWishlist).toHaveBeenCalledTimes(1);
    expect(showNotification).toHaveBeenCalledWith('Credit logged successfully!', 'success');
  });

  it('adds a cloud wishlist item and updates in-memory state immediately', async () => {
    const { addToWishlistAction } = await import('../context/domainActions');

    const setWishlist = vi.fn();
    const showNotification = vi.fn();

    const context = {
      activeUser: { id: 'u1' },
      compressImage: vi.fn(),
      credits: [],
      currentUser: { uid: 'uid-123' },
      generateId: vi.fn().mockReturnValue('w-new'),
      setCoasters: vi.fn(),
      setCredits: vi.fn(),
      setWishlist,
      showNotification,
      coasters: [],
      wishlist: [],
    } as any;

    await addToWishlistAction(context, 'c1');

    expect(mockUpsertWishlist).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'w-new',
        coasterId: 'c1',
        ownerId: 'uid-123',
        userId: 'u1',
      }),
    ]);
    expect(setWishlist).toHaveBeenCalledTimes(1);
    expect(showNotification).toHaveBeenCalledWith('Added to Bucket List', 'success');
  });

  it('deletes a cloud credit and removes it from in-memory list', async () => {
    const { deleteCreditAction } = await import('../context/domainActions');

    const setCredits = vi.fn();
    const showNotification = vi.fn();

    const context = {
      activeUser: { id: 'u1' },
      compressImage: vi.fn(),
      credits: [{ id: 'cr1', coasterId: 'c1', userId: 'u1', ownerId: 'uid-123', rideCount: 1, date: '2026-04-10' }],
      currentUser: { uid: 'uid-123' },
      generateId: vi.fn(),
      setCoasters: vi.fn(),
      setCredits,
      setWishlist: vi.fn(),
      showNotification,
      coasters: [],
      wishlist: [],
    } as any;

    await deleteCreditAction(context, 'cr1');

    expect(mockDeleteById).toHaveBeenCalledWith('credits', 'cr1');
    expect(setCredits).toHaveBeenCalledTimes(1);
    expect(showNotification).toHaveBeenCalledWith('Ride log deleted', 'info');
  });
});
