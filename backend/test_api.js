// ─── BACKEND SECURITY TESTS ──────────────────────────────────────────────────
// Requires backend server running on PORT 5000.
// Run: node backend/test_api.js
// (with backend started: cd backend && node src/server.js)

import assert from 'assert';

const BASE_URL = process.env.TEST_API_BASE || 'http://localhost:5000';

let passed = 0;
let failed = 0;

function pass(desc) { console.log(`  ✅ ${desc}`); passed++; }
function fail(desc, actual) { console.error(`  ❌ ${desc}`, actual != null ? `(got: ${actual})` : ''); failed++; }

async function check(desc, fn) {
    try { await fn(); }
    catch (e) { fail(desc, e?.message || String(e)); }
}

// Helper: fetch with timeout
async function timedFetch(url, opts = {}, ms = 5000) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), ms);
    try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
    finally { clearTimeout(id); }
}

async function runTests() {
    console.log(`\n── AgentSpark Backend Security Tests ──`);
    console.log(`   Target: ${BASE_URL}\n`);

    // ─── 1. Health check ───────────────────────────────────────────────────────
    await check('[1] GET /health returns 200 | 503', async () => {
        const r = await timedFetch(`${BASE_URL}/health`);
        if (r.status === 200 || r.status === 503) pass('Health endpoint responds');
        else fail('Health endpoint', r.status);

        const body = await r.json().catch(() => ({}));
        if (body.status) pass('Health body has status field');
        else fail('Health body missing status field');
    });

    // ─── 2. Security headers ───────────────────────────────────────────────────
    await check('[2] Helmet security headers', async () => {
        const r = await timedFetch(`${BASE_URL}/health`);
        const h = r.headers;
        if (h.get('x-content-type-options') === 'nosniff') pass('x-content-type-options: nosniff');
        else fail('Missing x-content-type-options header');
        if (h.get('x-frame-options')) pass('x-frame-options present');
        else fail('Missing x-frame-options header');
    });

    // ─── 3. IDOR — unauthenticated GET /api/v1/projects/:id → 401 (C-02) ───────
    await check('[3] C-02: Unauthenticated GET /projects/:id returns 401', async () => {
        const r = await timedFetch(`${BASE_URL}/api/v1/projects/any-random-id`);
        if (r.status === 401) pass('GET /projects/:id → 401 (IDOR fixed)');
        else fail('GET /projects/:id should be 401', `got ${r.status}`);
    });

    // ─── 4. Unauth generate → 401 (C-03) ─────────────────────────────────────
    await check('[4] C-03: Unauthenticated POST /generate returns 401', async () => {
        const r = await timedFetch(`${BASE_URL}/api/v1/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelId: 'gemini-1.5-flash', userMessage: 'hi', modelTag: 'gemini' }),
        });
        if (r.status === 401) pass('POST /generate → 401 (unauth blocked)');
        else fail('POST /generate should be 401', `got ${r.status}`);
    });

    // ─── 5. Unauth GET /projects → 401 ───────────────────────────────────────
    await check('[5] GET /api/v1/projects requires auth', async () => {
        const r = await timedFetch(`${BASE_URL}/api/v1/projects`);
        if (r.status === 401) pass('GET /projects → 401');
        else fail('GET /projects should be 401', `got ${r.status}`);
    });

    // ─── 6. Unauth GET /auth/me → 401 ─────────────────────────────────────────
    await check('[6] GET /auth/me without token returns 401', async () => {
        const r = await timedFetch(`${BASE_URL}/api/v1/auth/me`);
        if (r.status === 401) pass('GET /auth/me → 401');
        else fail('GET /auth/me should be 401', `got ${r.status}`);
    });

    // ─── 7. Invalid JWT → 401 ─────────────────────────────────────────────────
    await check('[7] Invalid Bearer token returns 401', async () => {
        const r = await timedFetch(`${BASE_URL}/api/v1/projects`, {
            headers: { Authorization: 'Bearer this.is.not.valid' },
        });
        if (r.status === 401) pass('Invalid JWT → 401');
        else fail('Invalid JWT should be 401', `got ${r.status}`);
    });

    // ─── 8. 404 for unknown routes ────────────────────────────────────────────
    await check('[8] Unknown route returns 404 JSON', async () => {
        const r = await timedFetch(`${BASE_URL}/api/v1/does-not-exist`);
        if (r.status === 404) pass('Unknown route → 404');
        else fail('Unknown route should be 404', `got ${r.status}`);
    });

    // ─── 9. GET /api/v1/templates (public) ───────────────────────────────────
    await check('[9] G-01: GET /api/v1/templates is publicly accessible', async () => {
        const r = await timedFetch(`${BASE_URL}/api/v1/templates`);
        if (r.status === 200) {
            const body = await r.json().catch(() => ({}));
            if (Array.isArray(body.templates)) pass('GET /templates → 200 with templates array');
            else fail('GET /templates missing templates array in body');
        } else {
            fail('GET /templates should be 200', `got ${r.status}`);
        }
    });

    // ─── 10. POST /api/v1/templates requires auth ─────────────────────────────
    await check('[10] POST /api/v1/templates requires auth', async () => {
        const r = await timedFetch(`${BASE_URL}/api/v1/templates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Test', agents: [] }),
        });
        if (r.status === 401) pass('POST /templates → 401 (auth required)');
        else fail('POST /templates should be 401', `got ${r.status}`);
    });

    // ─── Summary ───────────────────────────────────────────────────────────────
    const total = passed + failed;
    console.log(`\n── Results: ${passed}/${total} passed ──`);
    if (failed > 0) {
        console.error(`   ${failed} test(s) FAILED.`);
        process.exit(1);
    } else {
        console.log(`   All tests passed. ✅`);
    }
}

runTests().catch(err => {
    if (err.code === 'ECONNREFUSED' || err.cause?.code === 'ECONNREFUSED') {
        console.error('\n❌ Server is not running. Start it first:');
        console.error('   cd backend && node src/server.js');
    } else {
        console.error('\nUnexpected test error:', err);
    }
    process.exit(1);
});
