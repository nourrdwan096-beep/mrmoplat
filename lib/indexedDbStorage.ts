/**
 * IndexedDB Large Storage Engine for Mr. Mohamed Radwan Educational Platform
 * Prevents LocalStorage QuotaExceededError by storing large PDFs, images, and heavy blobs in IndexedDB.
 */

const DB_NAME = 'mr_radwan_indexed_vault_v1';
const DB_VERSION = 1;
const STORE_NAME = 'large_files_store';

function openVaultDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a large payload (Base64 string, Blob, or PDF data) into IndexedDB
 */
export async function saveVaultItem(id: string, data: string | Blob, metadata?: Record<string, any>): Promise<string> {
  try {
    const db = await openVaultDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        id,
        data,
        metadata: metadata || {},
        updatedAt: Date.now(),
      };

      const req = store.put(record);
      req.onsuccess = () => resolve(`idb://${id}`);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB save failed:', err);
    return id;
  }
}

/**
 * Retrieves a large payload from IndexedDB
 */
export async function getVaultItem(id: string): Promise<string | Blob | null> {
  const cleanId = id.startsWith('idb://') ? id.replace('idb://', '') : id;
  try {
    const db = await openVaultDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(cleanId);

      req.onsuccess = () => {
        if (req.result && req.result.data) {
          resolve(req.result.data);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB get failed:', err);
    return null;
  }
}

/**
 * Deletes an item from IndexedDB
 */
export async function deleteVaultItem(id: string): Promise<void> {
  const cleanId = id.startsWith('idb://') ? id.replace('idb://', '') : id;
  try {
    const db = await openVaultDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(cleanId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB delete failed:', err);
  }
}

/**
 * Resolves a URL that might be an `idb://` virtual URL into a playable/viewable Blob URL
 */
export async function resolveVirtualUrl(url: string | undefined): Promise<string> {
  if (!url) return '';
  if (!url.startsWith('idb://')) return url;

  try {
    const data = await getVaultItem(url);
    if (!data) return url;

    if (typeof data === 'string') {
      if (data.startsWith('data:')) {
        // Convert Base64 Data URL to Blob URL to conserve memory
        const byteCharacters = atob(data.split(',')[1] || '');
        const mime = data.split(';')[0].replace('data:', '') || 'application/pdf';
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mime });
        return URL.createObjectURL(blob);
      }
      return data;
    }

    if (data instanceof Blob) {
      return URL.createObjectURL(data);
    }
  } catch (err) {
    console.warn('Failed to resolve virtual IDB URL:', err);
  }

  return url;
}
