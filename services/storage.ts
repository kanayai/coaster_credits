
import {
  STORAGE_DB_NAME,
  STORAGE_MIGRATION_KEYS,
  STORAGE_STORE_NAME,
} from '../config/clientConfig';

const isLocalStorageAvailable = (): boolean => {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch (error) {
    console.warn('localStorage is not available', error);
    return false;
  }
};

const parseStoredValue = <T>(key: string, value: string | null): T | null => {
  if (value === null) return null;
  if (key === 'cc_active_user_id') return value as T;

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Failed to parse localStorage value for ${key}`, error);
    return null;
  }
};

const serializeStoredValue = (key: string, value: unknown): string => {
  if (value === null || typeof value === 'undefined') return 'null';
  return key === 'cc_active_user_id' ? String(value) : JSON.stringify(value);
};

const getLocalFallback = <T>(key: string): T | null => {
  if (!isLocalStorageAvailable()) return null;
  return parseStoredValue<T>(key, window.localStorage.getItem(key));
};

const setLocalFallback = (key: string, value: unknown): void => {
  if (!isLocalStorageAvailable()) return;

  if (value === null || typeof value === 'undefined') {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, serializeStoredValue(key, value));
};

const clearLocalFallback = (): void => {
  if (!isLocalStorageAvailable()) return;
  for (const key of STORAGE_MIGRATION_KEYS) {
    window.localStorage.removeItem(key);
  }
};

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }

    const request = indexedDB.open(STORAGE_DB_NAME, 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORAGE_STORE_NAME)) {
        db.createObjectStore(STORAGE_STORE_NAME);
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => {
        console.error("IDB Open Error:", request.error);
        reject(request.error);
    };
  });
};

export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORAGE_STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORAGE_STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result as T || null);
        request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("Storage Get Error", e);
        return getLocalFallback<T>(key);
    }
  },
  
  async set(key: string, value: any): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORAGE_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORAGE_STORE_NAME);
        const request = store.put(value, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("Storage Set Error", e);
        setLocalFallback(key, value);
    }
  },

  async clear(): Promise<void> {
      try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORAGE_STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORAGE_STORE_NAME);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
      } catch (e) {
        console.error("Storage Clear Error", e);
        clearLocalFallback();
      }
  },

  async migrateFromLocalStorage(): Promise<boolean> {
      let migratedAny = false;
      
      try {
        if (!isLocalStorageAvailable()) {
          return false;
        }

        for (const key of STORAGE_MIGRATION_KEYS) {
            const item = window.localStorage.getItem(key);
            if (item) {
                migratedAny = true;
                const val = parseStoredValue(key, item);
                await this.set(key, val);
                window.localStorage.removeItem(key);
            }
        }
      } catch (e) {
          console.error("Migration Error:", e);
      }
      return migratedAny;
  }
};
