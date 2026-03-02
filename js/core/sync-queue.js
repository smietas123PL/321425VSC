(function () {
    const DB_NAME = 'AgentSparkSyncDB';
    const STORE_NAME = 'offline_queue';

    function initSyncDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    window.enqueueSyncAction = async function (action) {
        const db = await initSyncDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.add(action);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    };

    window.processSyncQueue = async function () {
        if (!navigator.onLine) return;
        const db = await initSyncDB();
        const actions = await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        if (actions.length === 0) return;

        console.log(`[Sync] Processing ${actions.length} offline actions...`);
        if (typeof window.agentsparkApiFetch !== 'function') return;

        for (const action of actions) {
            try {
                await window.agentsparkApiFetch(action.path, {
                    method: action.method,
                    body: action.body
                });

                await new Promise((resolve, reject) => {
                    const tx = db.transaction(STORE_NAME, 'readwrite');
                    const req = tx.objectStore(STORE_NAME).delete(action.id);
                    req.onsuccess = resolve;
                    req.onerror = reject;
                });
            } catch (err) {
                console.error('[Sync] Action failed:', err);
            }
        }
    };

    window.addEventListener('online', () => {
        window.processSyncQueue();
    });
})();
