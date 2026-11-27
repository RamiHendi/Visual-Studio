import { StudioData } from '../types';
import { sanitizeStudioData } from './urlSecurity';

const DB_NAME = 'rami_hendi_visual_studio_db';
const DB_VERSION = 1;
const STORE_NAME = 'studio_cache';
const STUDIO_DATA_RECORD_KEY = 'live_studio_data_v1';

const LEGACY_LOCAL_CACHE_KEY = 'rami_hendi_visual_studio_live_cache_v3';
const LEGACY_SESSION_CACHE_KEY = 'rami_hendi_visual_studio_cms_cache_v2';
const LEGACY_URL_OVERRIDE_KEY = 'rami_hendi_custom_apps_script_url';

interface StudioCacheRecord {
  data: StudioData;
  cachedAt: number;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

export function isValidLiveStudioData(data: unknown): data is StudioData {
  if (!data || typeof data !== 'object') return false;
  const candidate = data as StudioData;
  if (!Array.isArray(candidate.portfolio)) return false;
  const hasDemoItems = candidate.portfolio.some((cat) =>
    (cat.items || []).some(
      (item) => typeof item.id === 'string' && item.id.startsWith('demo-')
    )
  );
  return !hasDemoItems;
}

function cleanupLegacyWebStorage(): void {
  try {
    localStorage.removeItem(LEGACY_LOCAL_CACHE_KEY);
    localStorage.removeItem(LEGACY_URL_OVERRIDE_KEY);
  } catch {
    void 0;
  }
  try {
    sessionStorage.removeItem(LEGACY_SESSION_CACHE_KEY);
  } catch {
    void 0;
  }
}

function readLegacyWebStorage(): StudioData | null {
  try {
    const localRaw = localStorage.getItem(LEGACY_LOCAL_CACHE_KEY);
    if (localRaw) {
      const parsed = JSON.parse(localRaw);
      if (isValidLiveStudioData(parsed) && parsed.portfolio.length > 0) {
        return parsed;
      }
    }
  } catch {
    void 0;
  }

  try {
    const sessionRaw = sessionStorage.getItem(LEGACY_SESSION_CACHE_KEY);
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw);
      if (isValidLiveStudioData(parsed) && parsed.portfolio.length > 0) {
        return parsed;
      }
    }
  } catch {
    void 0;
  }

  return null;
}

function openStudioDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = () => {
        dbPromise = null;
        resolve(null);
      };

      request.onblocked = () => {
        dbPromise = null;
        resolve(null);
      };
    } catch {
      dbPromise = null;
      resolve(null);
    }
  });

  return dbPromise;
}

export async function readStudioCache(): Promise<StudioData | null> {
  const db = await openStudioDB();
  if (db) {
    try {
      const record = await new Promise<StudioCacheRecord | undefined>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(STUDIO_DATA_RECORD_KEY);

        req.onsuccess = () => resolve(req.result as StudioCacheRecord | undefined);
        req.onerror = () => resolve(undefined);
        tx.onabort = () => resolve(undefined);
      });

      if (record && isValidLiveStudioData(record.data) && record.data.portfolio.length > 0) {
        return sanitizeStudioData(record.data);
      }

      if (record) {
        void clearStudioCache();
      }
    } catch {
      void 0;
    }
  }

  const migrated = readLegacyWebStorage();
  if (migrated) {
    const cleanMigrated = sanitizeStudioData(migrated);
    void writeStudioCache(cleanMigrated);
    return cleanMigrated;
  }

  cleanupLegacyWebStorage();
  return null;
}

export async function writeStudioCache(data: StudioData): Promise<void> {
  cleanupLegacyWebStorage();
  const db = await openStudioDB();
  if (!db) return;

  try {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: StudioCacheRecord = {
        data: sanitizeStudioData(data),
        cachedAt: Date.now(),
      };
      store.put(record, STUDIO_DATA_RECORD_KEY);

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch {
    void 0;
  }
}

export async function updateCachedVisitorCount(visitorCount: number): Promise<void> {
  if (!Number.isFinite(visitorCount)) return;
  const db = await openStudioDB();
  if (!db) return;

  try {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(STUDIO_DATA_RECORD_KEY);

      getReq.onsuccess = () => {
        const existing = getReq.result as StudioCacheRecord | undefined;
        if (existing && isValidLiveStudioData(existing.data)) {
          const updated: StudioCacheRecord = {
            data: {
              ...existing.data,
              visitorCount,
            },
            cachedAt: existing.cachedAt,
          };
          store.put(updated, STUDIO_DATA_RECORD_KEY);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch {
    void 0;
  }
}

export async function clearStudioCache(): Promise<void> {
  cleanupLegacyWebStorage();
  const db = await openStudioDB();
  if (!db) return;

  try {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(STUDIO_DATA_RECORD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch {
    void 0;
  }
}
