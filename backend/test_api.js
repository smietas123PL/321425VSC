import fetch from 'node-fetch'; // Używamy Node 18 fetch, a w pakiecie jest też isomorphic-fetch w razie czego
import assert from 'assert';

const BASE_URL = 'http://localhost:5000';

async function runTests() {
    console.log('--- STARTING BACKEND SECURITY TESTS ---');
    let passed = 0;
    let failed = 0;

    const testUrls = [
        { method: 'GET', url: '/non-existent-path', desc: '404 and Security Headers' }
    ];

    try {
        // 1. Sprawdzenie nagłówków bezpieczeństwa (Helmet/CSP)
        console.log('[TEST 1] Security Headers (Helmet, CSP)');
        const resHeaders = await fetch(BASE_URL + '/');
        const headers = resHeaders.headers;

        // Express returns 404 for root if no route, but headers should be present
        const csp = headers.get('content-security-policy');
        const hsts = headers.get('strict-transport-security');

        if (csp && csp.includes("default-src 'self'")) {
            console.log('  ✅ CSP is present and valid');
            passed++;
        } else {
            console.error('  ❌ CSP is missing or invalid');
            failed++;
        }

        if (hsts && hsts.includes('max-age=31536000')) {
            console.log('  ✅ HSTS is present and valid');
            passed++;
        } else {
            console.error('  ❌ HSTS is missing or invalid');
            failed++;
        }

        // 2. Auth Endpoints - Brak dostępu (401)
        console.log('[TEST 2] Missing Auth Token on Protected Route');
        const resAuthMe = await fetch(BASE_URL + '/api/v1/auth/me');
        if (resAuthMe.status === 401) {
            console.log('  ✅ /auth/me returns 401 Unauthorized');
            passed++;
        } else {
            console.error('  ❌ /auth/me returned ' + resAuthMe.status);
            failed++;
        }

        // 3. Rejestracja testowa (Local Auth)
        console.log('[TEST 3] Local Registration (POST /api/v1/auth/register)');
        const email = `testuser_${Date.now()}@example.com`;
        const resReg = await fetch(BASE_URL + '/api/v1/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, name: 'Test User' })
        });

        if (resReg.status === 201) {
            const dataReg = await resReg.json();
            if (dataReg.token && dataReg.user) {
                console.log('  ✅ Registration successful, token received');
                passed++;

                // 4. Dostęp do chronionego zasobu z tokenem
                console.log('[TEST 4] Authenticated Route Access');
                const resMeAuth = await fetch(BASE_URL + '/api/v1/auth/me', {
                    headers: { 'Authorization': 'Bearer ' + dataReg.token }
                });
                if (resMeAuth.status === 200) {
                    const authData = await resMeAuth.json();
                    if (authData.user.email === email) {
                        console.log('  ✅ /auth/me returns valid user data using Token');
                        passed++;
                    } else {
                        console.error('  ❌ /auth/me user data mismatch');
                        failed++;
                    }
                } else {
                    console.error('  ❌ /auth/me failed with token. Status: ' + resMeAuth.status);
                    failed++;
                }

            } else {
                console.error('  ❌ Registration JSON missing token/user');
                failed++;
            }
        } else {
            console.error('  ❌ Registration failed. Status: ' + resReg.status);
            failed++;
        }

        // 5. Rate Limiting (jeśli jest skonfigurowane na np. 10 żądań w oknie)
        console.log('[TEST 5] Checking endpoint presence (Projects)');
        const resProjects = await fetch(BASE_URL + '/api/v1/projects', { method: 'GET' });
        if (resProjects.status === 401) {
            console.log('  ✅ /projects correctly requires Auth');
            passed++;
        } else {
            console.error('  ❌ /projects returned ' + resProjects.status);
            failed++;
        }

        console.log(`\n--- TEST RESULTS: ${passed} Passed, ${failed} Failed ---`);
        if (failed > 0) process.exit(1);

    } catch (err) {
        if (err.code === 'ECONNREFUSED') {
            console.error('❌ Serwer odrzuca połączenie. Upewnij się, że backend jest urchomiony.');
        } else {
            console.error('Wystąpił nieoczekiwany błąd w teście:', err);
        }
    }
}

runTests();
