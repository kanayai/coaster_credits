import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockUpdateCredit = vi.fn();

vi.mock('../services/supabaseData', () => ({
  updateCredit: mockUpdateCredit,
  updateCoaster: vi.fn(),
  upsertCoasters: vi.fn(),
  upsertCredits: vi.fn(),
  upsertWishlist: vi.fn(),
  deleteById: vi.fn(),
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
    mockUpdateCredit.mockReset();
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
});
