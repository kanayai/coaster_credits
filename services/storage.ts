
const DB_NAME = 'CoasterCountDB';
const STORE_NAME = 'app_data';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
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
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result as T || null);
        request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("Storage Get Error", e);
        return null;
    }
  },
  
  async set(key: string, value: any): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(value, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("Storage Set Error", e);
        throw e; 
    }
  },

  async clear(): Promise<void> {
      const db = await openDB();
      return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_NAME, 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
  },

  async migrateFromLocalStorage(): Promise<boolean> {
      const keys = ['cc_users', 'cc_coasters', 'cc_credits', 'cc_wishlist', 'cc_active_user_id'];
      let migratedAny = false;
      
      try {
        for (const key of keys) {
            const item = localStorage.getItem(key);
            if (item) {
                migratedAny = true;
                const val = key === 'cc_active_user_id' ? item : JSON.parse(item);
                await this.set(key, val);
                localStorage.removeItem(key);
            }
        }
      } catch (e) {
          console.error("Migration Error:", e);
      }
      return migratedAny;
  }
};
