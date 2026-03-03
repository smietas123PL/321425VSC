// ─── FIRESTORE.JS — Firebase Admin SDK (ESM) ─────────────────────────────
// Fixed C-01: Converted from CommonJS (require/module.exports) to ESM
// (import/export). backend/package.json has "type":"module" — CJS caused
// server crash on startup. No logic changes.

import admin from 'firebase-admin';

// Ensure this is only initialized once
if (!admin.apps.length) {
    let credential;

    // Try to load from env var first (e.g. set by Render/Railway)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            credential = admin.credential.cert(serviceAccount);
        } catch (e) {
            console.warn('[Firestore] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON. Falling back to default.');
            credential = admin.credential.applicationDefault();
        }
    } else {
        // Fallback to applicationDefault (which uses GOOGLE_APPLICATION_CREDENTIALS)
        console.log('[Firestore] FIREBASE_SERVICE_ACCOUNT not set. Using applicationDefault().');
        credential = admin.credential.applicationDefault();
    }

    try {
        admin.initializeApp({ credential });
        console.log('[Firestore] Firebase Admin initialized.');
    } catch (err) {
        console.error('[Firestore] Init error:', err.message);
    }
}

const db = admin.firestore();

export { db, admin };
