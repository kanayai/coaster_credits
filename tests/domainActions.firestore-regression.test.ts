import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockUpdateDoc = vi.fn();
const mockDoc = vi.fn(() => 'credits/cr1');
const mockHandleFirestoreError = vi.fn();

const stripUndefined = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stripUndefined);
  }

  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, inner]) => {
      if (inner !== undefined) {
        out[key] = stripUndefined(inner);
      }
    });
    return out;
  }

  return value;
};

vi.mock('../firebase', () => ({
  db: {},
  deleteDoc: vi.fn(),
  doc: mockDoc,
  handleFirestoreError: mockHandleFirestoreError,
  OperationType: {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    LIST: 'list',
    GET: 'get',
    WRITE: 'write',
  },
  setDoc: vi.fn(),
  updateDoc: mockUpdateDoc,
  writeBatch: vi.fn(),
  cleanForFirestore: stripUndefined,
  isValidFirestoreDocId: vi.fn(() => true),
  isValidFirestoreOwnerId: vi.fn(() => true),
  isValidIsoDate: vi.fn(() => true),
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
    mockUpdateDoc.mockReset();
    mockDoc.mockClear();
    mockHandleFirestoreError.mockClear();
  });

  it('removes undefined fields before sending payload to Firestore', async () => {
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

    expect(mockDoc).toHaveBeenCalledWith({}, 'credits', 'cr1');
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);

    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload).toEqual({
      date: '2026-04-10',
      notes: 'Great ride',
      restraints: 'Lap bar',
      gallery: [],
    });
    expect(payload).not.toHaveProperty('photoUrl');
    expect(payload).not.toHaveProperty('variant');
    expect(mockHandleFirestoreError).not.toHaveBeenCalled();
  });
});
