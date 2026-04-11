import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockStorage = {
  get: vi.fn(),
  set: vi.fn(),
};

const mockBatchSet = vi.fn();
const mockBatchCommit = vi.fn();
const mockWriteBatch = vi.fn(() => ({
  set: mockBatchSet,
  commit: mockBatchCommit,
}));

const mockDoc = vi.fn((dbRef: unknown, collectionName: string, id: string) => ({ collectionName, id }));

const mockFirestoreGetDoc = vi.fn();
const mockFirestoreDoc = vi.fn((dbRef: unknown, collectionName: string, id: string) => ({ collectionName, id }));

const stripUndefined = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, inner]) => {
      if (inner !== undefined) out[key] = stripUndefined(inner);
    });
    return out;
  }
  return value;
};

vi.mock('../services/storage', () => ({ storage: mockStorage }));

vi.mock('../firebase', () => ({
  db: {},
  collection: vi.fn(),
  doc: mockDoc,
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  writeBatch: mockWriteBatch,
  handleFirestoreError: vi.fn(),
  OperationType: {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    LIST: 'list',
    GET: 'get',
    WRITE: 'write',
  },
  cleanForFirestore: stripUndefined,
  isValidFirestoreDocId: vi.fn(() => true),
  isValidFirestoreOwnerId: vi.fn(() => true),
}));

vi.mock('firebase/firestore', () => ({
  getDoc: mockFirestoreGetDoc,
  doc: mockFirestoreDoc,
}));

describe('cloud sync QA: migration conflict handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage.set.mockResolvedValue(undefined);
    mockBatchCommit.mockResolvedValue(undefined);

    mockStorage.get.mockImplementation(async (key: string) => {
      if (key === 'cc_users') {
        return [{ id: 'u_conflict', ownerId: 'local', name: 'Conflict User', avatarColor: 'bg-slate-500' }];
      }
      if (key === 'cc_coasters') return [];
      if (key === 'cc_credits') return [];
      if (key === 'cc_wishlist') return [];
      return null;
    });

    mockFirestoreGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ ownerId: 'different-owner' }),
    });
  });

  it('skips writing entities owned by another account and still completes migration flow', async () => {
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

    const userWrites = mockBatchSet.mock.calls.filter(([, payload]) => payload?.id === 'u_conflict');
    expect(userWrites.length).toBe(0);

    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    expect(showNotification).toHaveBeenCalledWith('Manual migration successful!', 'success');
    expect(manualRefresh).toHaveBeenCalledTimes(1);
    expect(setIsSyncing).toHaveBeenNthCalledWith(1, true);
    expect(setIsSyncing).toHaveBeenLastCalledWith(false);
  });
});
