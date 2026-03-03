// ─── CORE/SYNC-QUEUE.TS ──────────────────────────────────
// Fixed H-07: Pass auth token when replaying offline actions.
// Fixed M-09: Added max retry limit (5 attempts) with exponential backoff.
//             Actions that persistently fail are removed from queue.

interface SyncAction {
  id?: number;
  path: string;
  method: string;
  body?: any;
  timestamp: number;
  retryCount?: number; // M-09: track attempts
}

interface AgentSparkWindow extends Window {
  enqueueSyncAction: (action: SyncAction) => Promise<void>;
  processSyncQueue: () => Promise<void>;
  agentsparkApiFetch?: (path: string, options: any) => Promise<any>;
}
declare let window: AgentSparkWindow;

const DB_NAME = 'AgentSparkSyncDB';
const STORE_NAME = 'offline_queue';
const MAX_RETRIES = 5; // M-09: discard after 5 failed attempts

function initSyncDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueSyncAction(action: SyncAction): Promise<void> {
  const db = await initSyncDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add({ ...action, retryCount: 0 }); // M-09: init retry count
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function deleteQueuedAction(db: IDBDatabase, id: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function updateRetryCount(db: IDBDatabase, action: SyncAction): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).put({
      ...action,
      retryCount: (action.retryCount || 0) + 1,
    });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function processSyncQueue(): Promise<void> {
  if (!navigator.onLine) return;
  const db = await initSyncDB();
  const actions: SyncAction[] = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as SyncAction[]);
    req.onerror = () => reject(req.error);
  });

  if (actions.length === 0) return;
  console.log(`[Sync] Processing ${actions.length} offline actions...`);
  if (typeof window.agentsparkApiFetch !== 'function') return;

  // H-07: Read auth token from sessionStorage for replay calls
  const AUTH_TOKEN_KEY = 'agentspark-auth-token';
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || '';

  for (const action of actions) {
    // M-09: Discard permanently-failed actions
    if ((action.retryCount || 0) >= MAX_RETRIES) {
      console.warn(`[Sync] Discarding action ${action.id} after ${MAX_RETRIES} failed retries:`, action.path);
      await deleteQueuedAction(db, action.id as number);
      continue;
    }

    try {
      // M-09: Exponential backoff delay before retry (skip for first attempt)
      if ((action.retryCount || 0) > 0) {
        const delayMs = Math.min(1000 * Math.pow(2, action.retryCount || 0), 30_000);
        await new Promise(res => setTimeout(res, delayMs));
      }

      // H-07: Pass auth token in replayed requests
      await window.agentsparkApiFetch(action.path, {
        method: action.method,
        body: action.body,
        token,  // H-07: was missing — caused all replays to fire unauthenticated
      });

      // Success — remove from queue
      await deleteQueuedAction(db, action.id as number);
      console.log(`[Sync] Action replayed successfully:`, action.method, action.path);
    } catch (err) {
      console.error('[Sync] Action failed, incrementing retry count:', err);
      // M-09: Increment retry count; action stays in queue for next attempt
      await updateRetryCount(db, action);
    }
  }
}

window.enqueueSyncAction = enqueueSyncAction;
window.processSyncQueue = processSyncQueue;

window.addEventListener('online', () => {
  window.processSyncQueue();
});
