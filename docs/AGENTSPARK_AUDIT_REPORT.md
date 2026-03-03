# 🔍 AGENTSPARK — PEŁNY AUDYT PRE-RELEASE
**Data audytu:** 2026-03-03  
**Wersja projektu:** 1.1.0  
**Repo:** github.com/smietas123PL/321425VSC  
**Audytor:** Claude Sonnet 4.6

---

## EXECUTIVE SUMMARY

AgentSpark to aplikacja do generowania zespołów AI agentów — składa się z **frontendu (Vite + TypeScript + vanilla JS)** oraz **backendu (Node.js + Express + Firestore)**. Projekt ma solidne fundamenty bezpieczeństwa i dobrze zorganizowaną infrastrukturę CI/CD, ale **nie jest gotowy do release'u produkcyjnego** ze względu na krytyczne błędy TypeScript (659 błędów w 14 plikach), niespójną architekturę bazy danych, brakujące testy integracyjne i kilka otwartych kwestii bezpieczeństwa.

### Ogólna ocena: ⚠️ 5.5/10 — WYMAGA PRACY PRZED RELEASE'EM

| Obszar | Ocena | Status |
|--------|-------|--------|
| Bezpieczeństwo (backend) | 7/10 | 🟡 Dobry fundament, luki do zamknięcia |
| Jakość kodu frontend | 3/10 | 🔴 659 błędów TS blokujących release |
| Architektura bazy danych | 4/10 | 🔴 Podwójna baza (SQLite + Firestore) — chaos |
| Testy | 4/10 | 🟡 Tylko security smoke tests, brak unit/e2e |
| CI/CD | 7/10 | 🟢 Dobra konfiguracja, ale typecheck pomijany |
| Dokumentacja | 6/10 | 🟡 README OK, ale brak API docs |
| Wydajność | 5/10 | 🟡 Brak monitoringu produkcyjnego |
| UX/Dostępność | 5/10 | 🟡 Brak testów a11y |

---

## SEKCJA 1 — KRYTYCZNE BLOKERY RELEASE'U 🔴

### 1.1 TypeScript — 659 błędów kompilacji

**Priorytet: KRYTYCZNY — musi być naprawione przed release'em**

Projekt zawiera 659 błędów TypeScript w 14 plikach. To oznacza, że **TypeScript w zasadzie nie działa** — kompilator jest uruchomiony, ale w trybie permisywnym lub z dużą ilością `any`.

Rozkład błędów:
```
318  js/app.ts        — główny plik aplikacji
 84  js/db.ts         — warstwa danych IndexedDB  
 47  js/features/share-loader.ts
 45  js/ui/results-render.ts
 29  js/features/playground.ts
 28  js/auth.ts
 26  js/export.ts
 26  js/features/interview.ts
 25  js/ui/graph.ts
 17  js/gallery.ts
  7  js/ui/screens.ts
  5  js/features/share.ts
  1  js/core/generation-client.ts
  1  js/core/sync-queue.ts
```

**Najgroźniejsze kategorie błędów:**

- `TS7006` — parametry funkcji z typem `any` (np. `Parameter 'uid' implicitly has an 'any' type`)  
- `TS18047` — potencjalne null reference bez sprawdzania (`'label' is possibly 'null'`)  
- `TS2451` — redeclaration zmiennych między modułami (`Cannot redeclare block-scoped variable '_currentProjectId'`)  
- `TS7053` — dostęp do właściwości przez string key bez index signature  
- `TS18046` — `'err' is of type 'unknown'` — nieobsługiwane wyjątki  
- `TS2339` — dostęp do nieistniejących właściwości (`Property 'updatedAt' does not exist on type '{}'`)

**js/db.ts — szczególnie groźny:**
- `db` zmiennej jest typu `unknown` w całym pliku (linia 27, 37, 46, 55)
- `versionHistory` jest undefined (TS2304) — prawdopodobnie błąd zakresu zmiennej
- `e.target.result` bez rzutowania — crashuje w IE/starszych przeglądarkach

**Co to oznacza praktycznie:**  
Błędy TS nie blokują `vite build` (JS jest transpilowany mimo błędów), ale oznaczają, że:
1. Nie ma type safety — runtime błędy mogą pojawić się u użytkowników
2. Refaktoryzacja jest bardzo ryzykowna
3. `tsc --noEmit` w CI **musi failować** — co CI raportuje jako błąd

---

### 1.2 Podwójna architektura bazy danych — SQLite vs Firestore

**Priorytet: KRYTYCZNY**

Projekt ma **dwie różne bazy danych** i nie jest jasne, która jest używana w produkcji:

- `backend/README.md` dokumentuje schemat SQLite (tabele: `users`, `projects`, `project_shares`, `audit_log`, `community_templates`)
- `backend/src/db/firestore.js` implementuje połączenie z Firestore
- `backend/src/db/models.js` używa Firestore (`db.collection(...)`)
- `backend/src/server.js` komentuje: *"NOTE: models.js uses Firestore (via firestore.js). SQLite/initDatabase removed."*

**Problemy:**
- README jest nieaktualny — opisuje SQLite, które już nie istnieje
- Brak migracji danych z SQLite do Firestore
- Lokalne środowisko deweloperskie bez credentials Firebase crashuje (mimo fallbacku do `demo-local-project`, Firestore emulator nie jest konfigurowany)
- Firestore inicjalizacja ma race condition — `!admin.apps.length` + `credential` mogą prowadzić do sytuacji gdzie `admin.initializeApp()` nie jest nigdy wywołany

**Fragment problematycznego kodu w firestore.js:**
```javascript
if (!admin.apps.length && credential) {
    // Ten blok nie jest osiągany jeśli wcześniej weszliśmy w else branch 
    // i wywołaliśmy admin.initializeApp({ projectId: 'demo-local-project' })
}
```

---

### 1.3 GitHub token przechowywany w UI — ryzyko wycieku

**Priorytet: WYSOKI**

Funkcja "Publish to Gist" wymaga od użytkownika wpisania Personal Access Token bezpośrednio w `<input type="text">`. Token jest widoczny w DOM i może:
- Być przechwycony przez browser extensions
- Pojawić się w logach błędów / Sentry
- Zostać zapamiętany przez password managery

Brakuje:
- `type="password"` na polu tokenu  
- Czyszczenia tokenu z pamięci po użyciu  
- Ostrzeżenia o zakresie tokenu

---

## SEKCJA 2 — BEZPIECZEŃSTWO 🔴🟡

### 2.1 Co działa dobrze ✅

- **Helmet.js** — poprawnie skonfigurowany, headers CSP, HSTS, X-Frame-Options
- **JWT z krótkim TTL** — 15 minut (dobra praktyka, zmiana z 7 dni)
- **Rate limiting** — `globalLimiter` + `authLimiter` osobno
- **CORS whitelist** — nie wildcard
- **Input validation** — middleware obecny
- **IDOR fix** — endpoint `GET /projects/:id` wymaga `requireAuth` (nie `authMiddleware`)
- **Field injection protection** — `ALLOWED_UPDATE_FIELDS` whitelist w `projects.js`
- **Audit logging** — w modelu
- **Crypto UUID** — `crypto.randomUUID()` zamiast `Math.random()`
- **CORS_ORIGIN wymagany w produkcji** — `process.exit(1)` jeśli nie ustawiony
- **JWT_SECRET wymagany** — `process.exit(1)` jeśli nie ustawiony

### 2.2 Luki do naprawy 🔴

**Brak refresh tokenów:**  
JWT TTL 15 minut jest dobry, ale bez mechanizmu refresh tokenów użytkownicy będą wylogowywani co 15 minut. Frontend musi albo:
- Wysyłać refresh przed wygaśnięciem
- Implementować silent refresh  
Brak tego mechanizmu = bardzo zły UX

**CSP z `unsafe-inline` dla skryptów (netlify.toml):**  
```toml
script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com
```
`unsafe-inline` w `script-src` praktycznie wyłącza XSS protection przez CSP. Backend ma to już naprawione (komentarz M-06: `'unsafe-inline' removed`), ale Netlify deployment nadal to ma.

**API klucze użytkowników w sessionStorage:**  
Klucze API (Anthropic, OpenAI, etc.) są przechowywane w `sessionStorage`. Choć lepsze niż `localStorage`, nadal:
- Dostępne przez XSS
- Nie są szyfrowane
- Brak automatycznego czyszczenia po timeout

**HMAC secret w .env.example jako placeholder:**  
```
REQUEST_HMAC_SECRET=change_me_hmac_secret
```
Brak walidacji przy starcie czy HMAC secret został zmieniony z wartości domyślnej.

**Brak rate limiting na poziomie użytkownika:**  
Rate limiting jest per-IP. Atakujący z wielu IP (botnet) może obejść ograniczenia. Brak per-user rate limiting po autentykacji.

### 2.3 Mniejsze problemy 🟡

- Brak `helmet.expectCt()` — Certificate Transparency  
- Brak `Strict-Transport-Security` preload na Netlify headers  
- Error stack trace lekowany w development mode — ok dla dev, ale należy upewnić się, że `NODE_ENV=production` jest zawsze ustawiony  
- Brak walidacji Content-Type na wszystkich endpointach POST

---

## SEKCJA 3 — JAKOŚĆ KODU FRONTENDOWEGO 🔴

### 3.1 Architektura — monolityczny index.html

Projekt ma **hybrydową architekturę** która jest problematyczna:
- `index.html` — "single-file, self-contained" (wg README)
- Jednocześnie istnieją pliki `js/*.ts` kompilowane przez Vite

To rodzi pytania:
1. Który plik jest source of truth — `index.html` czy pliki TS?
2. Czy `index.html` zawiera duplikaty kodu z plików TS?
3. Jak wygląda bundle — czy `index.html` embedduje transpilowany JS?

README mówi "single-file, self-contained" ale `package.json` ma `vite build` — to sprzeczność.

### 3.2 Globalne zmienne — spaghetti state

Kod używa zmiennych globalnych (`generatedAgents`, `currentTopic`, `currentLevel`, `lang`, `versionHistory`, `chatHistory`, `selectedModel`) zamiast proper state managementu. To powoduje:
- Trudne debugowanie  
- Race conditions przy async operacjach  
- Redeclaration błędy między modułami (TS2451)  
- Niemożliwość testowania jednostkowego

### 3.3 IndexedDB — nieobsługiwane edge cases

`js/db.ts` używa IndexedDB bez:
- Proper error handling (mnóstwo `TS18047` null errors)
- Versioning strategii dla schema migration
- Fallbacku gdy IndexedDB jest niedostępne (Safari private mode, etc.)
- Cleanup starych rekordów

### 3.4 Brak proper modułów ES

Wiele funkcji jest eksportowanych przez `window.xxx = function()` zamiast ES modules:
```javascript
window.saveCurrentProject = saveCurrentProject;
window.loadProject = loadProject;
// etc.
```
To uniemożliwia tree-shaking i powoduje konflikty nazw.

---

## SEKCJA 4 — TESTY 🔴

### 4.1 Co istnieje

- `backend/test_api.js` — 10 security smoke testów HTTP
- `scripts/release-smoke.mjs` — build smoke test (wspomniane w CI)

### 4.2 Czego brakuje (krytycznie)

**Unit testy** — brak jakichkolwiek:
- Dla logiki generowania agentów
- Dla warstwy bazodanowej (Firestore models)
- Dla middleware (auth, validation, rate limiting)
- Dla funkcji eksportu (ZIP, Markdown, etc.)

**Integracyjne testy** — brak:
- Flow: register → login → generate → save → export
- Gist publish/import flow
- Import/export JSON flow

**E2E testy** — brak:
- Playwright / Cypress nie zainstalowane
- Nie ma testów krytycznych user journeys

**Frontend testy** — brak:
- Vitest / Jest nie w `package.json`
- Żadnych testów komponentów

**Coverage** — 0% mierzone

### 4.3 CI/CD a testy

`.github/workflows/ci.yml` zawiera:
- `lint` — ✅  
- `typecheck` — ✅ (ale skoro jest 659 błędów TS, to **CI musi failować**)  
- `smoke` — ✅  
- `backend-syntax` — ✅  

**Brakuje:**
- Uruchamiania testów backendu w CI (jest `test_api.js` ale wymaga działającego serwera)
- Security scan (np. `npm audit` w CI)
- Dependency vulnerability check (GitHub Dependabot nie skonfigurowany)

---

## SEKCJA 5 — INFRASTRUKTURA I DEPLOYMENT 🟡

### 5.1 Co jest dobre

- GitHub Actions — dobrze skonfigurowane
- Netlify.toml + Vercel.json — oba presente
- `deploy.sh` — interactive deployment helper  
- Cache headers dla statycznych assetów  
- PWA manifest + service worker — obecne

### 5.2 Problemy deploymentu

**Placeholder URLs w konfiguracji:**
```javascript
// package.json
"url": "git+https://github.com/smietas123PL/321425VSC.git"
// README.md  
"repository=https://github.com/yourusername/agentspark"
// deploy.sh
"git remote add origin https://github.com/yourusername/agentspark.git"
```
README i deploy.sh mają `yourusername` — deploy.sh musi być zaktualizowany przed release'em.

**Service worker cache strategy:**  
Service worker cachuje assety ale strategia invalidacji przy nowym deployu nie jest jasna. Bez proper cache busting użytkownicy mogą utknąć na starej wersji.

**Brak health check dla Firestore:**  
`/health` endpoint próbuje połączyć z Firestore z 5s timeout — OK. Ale przy degradacji Firestore, cały backend jest `503` nawet jeśli statyczna treść działa.

**Node.js version:**  
`package.json`: `"node": ">=14.0.0"` — bardzo szeroki zakres.  
Backend używa `crypto.randomUUID()` (Node 18+) i Firebase Admin który wymaga Node 20+.  
Powinno być `"node": ">=20.0.0"`.

**Brak Dockerfile:**  
Nie ma konteneryzacji — deployment jest platformo-zależny (Render/Railway/Heroku). Brak możliwości lokalnego testowania w środowisku produkcyjnym.

---

## SEKCJA 6 — DOKUMENTACJA 🟡

### 6.1 Co jest dobre

- `README.md` — przejrzysty, z deploy instructions
- `backend/README.md` — obecny
- `.env.example` — wszystkie zmienne opisane

### 6.2 Problemy dokumentacji

- **backend/README.md opisuje SQLite** — które już nie istnieje (Firestore jest używany)
- **Brak API dokumentacji** — żadnego OpenAPI/Swagger spec
- **Brak CHANGELOG.md** — historia zmian tylko w komentarzach kodu
- **Brak CONTRIBUTING.md** — poza mini-sekcją w README
- **Brak dokumentacji architektury** — jak frontend komunikuje się z backendem nie jest jasne
- **yourusername placeholdery** — w README i deploy.sh
- **Niezgodność wersji** — package.json mówi `1.1.0` ale kod wspomina `v1.2.0` i `v1.4.0` w komentarzach

---

## SEKCJA 7 — WYDAJNOŚĆ I MONITORING 🟡

### 7.1 Frontend wydajność

- Vite build — dobry (tree-shaking, minifikacja)
- Brak lazy loading dla galerii szablonów
- Brak virtual scrolling dla długich list agentów
- D3.js graph — brak ograniczenia nodes, może być wolny przy dużych teamach
- Brak image optimization pipeline

### 7.2 Backend wydajność

- Brak connection pooling (Firestore SDK robi to automatycznie — OK)
- Brak cachowania odpowiedzi (np. Redis)
- Brak paginacji na `GET /projects` — zwraca wszystkie projekty użytkownika
- N+1 queries nie są widoczne w Firestore API ale warto sprawdzić model `getProject`

### 7.3 Monitoring

- Sentry — opcjonalnie skonfigurowany (`if process.env.SENTRY_DSN`) ✅
- Brak structured logging (tylko `console.log`)
- Brak alertów produkcyjnych
- Brak performance monitoring (Core Web Vitals, etc.)
- Audit log istnieje ale brak narzędzi do przeglądania

---

## SEKCJA 8 — UX I DOSTĘPNOŚĆ 🟡

### 8.1 Dostępność (a11y)

- Brak testów WCAG 2.1
- Modal close buttons mają `aria-label` ✅
- Brak skip navigation links
- Brak focus management przy otwieraniu modali
- Kontrast kolorów nie był sprawdzany
- Brak keyboard navigation testów

### 8.2 Internacjonalizacja (i18n)

Projekt ma bilingual support (EN/PL) ale implementacja jest problematyczna:
- String translations rozproszone inline (`lang === 'en' ? '...' : '...'`)  
- Brak centralnego pliku z tłumaczeniami  
- Brak systemu i18n (np. i18next)  
- Niekonsekwentne — niektóre UI elementy tylko po angielsku

### 8.3 Error handling UX

- Błędy API nie zawsze są czytelnie komunikowane
- Brak offline detection / graceful degradation
- PWA service worker może służyć stary content po błędzie sieci

---

## SEKCJA 9 — ZALEŻNOŚCI I LICENCJE 🟡

### 9.1 Frontend dependencies

`package.json` ma tylko devDependencies + Sentry:
```json
"dependencies": { "@sentry/browser": "^10.41.0" },
"devDependencies": { "eslint", "prettier", "typescript", "vite" }
```
To jest dobre — minimalne zależności.

**Problem:** `glob@7.2.3` jest deprecated i zawiera znane luki bezpieczeństwa (wspomniane w `package-lock.json`). Wymaga aktualizacji.

### 9.2 Backend dependencies

Firebase Admin SDK + Express + Helmet + JWT — rozsądny stack.

**Potencjalne problemy:**
- `firebase-admin` wymaga Node 20+ — engine w package.json mówi tylko `>=18`
- Brak `npm audit` w CI pipeline
- `package-lock.json` commity — dobrze ✅

### 9.3 Licencje

- Projekt: MIT ✅
- Wszystkie główne zależności: MIT / Apache 2.0 ✅

---

## PODSUMOWANIE — LISTA TEMATÓW DO ZREALIZOWANIA

### 🔴 BLOKERY (przed release'em)

1. **Naprawić wszystkie 659 błędów TypeScript** (lub wyłączyć strict mode świadomie i dodać `// @ts-nocheck` z planem naprawy)
2. **Ujednolicić architekturę bazy danych** — zdecydować SQLite vs Firestore, zaktualizować README, usunąć martwy kod
3. **Naprawić race condition w inicjalizacji Firestore** — przepisać blok warunkowy
4. **Dodać refresh token mechanizm** — 15min JWT bez refresh = zły UX
5. **Zaktualizować engines w package.json** — zmienić na `"node": ">=20.0.0"`

### 🟡 WYSOKI PRIORYTET (przed release'em lub tuż po)

6. **Usunąć `unsafe-inline` z CSP** w netlify.toml — dopasować do backendu
7. **Pole GitHub token zmienić na `type="password"`** + czyścić po użyciu
8. **Napisać testy integracyjne** — minimum happy path (register → generate → save → export)
9. **Dodać `npm audit` do CI pipeline**
10. **Zaktualizować backend/README.md** — usunąć SQLite, opisać Firestore
11. **Usunąć placeholder `yourusername`** ze wszystkich plików (README, deploy.sh)
12. **Dodać per-user rate limiting** po autentykacji (nie tylko per-IP)
13. **Ujednolicić i18n** — centralny plik tłumaczeń zamiast inline ternary

### 🟢 NORMAL PRIORITY (roadmap)

14. **Przepisać globalne zmienne na proper state management** (Context API, Zustand, lub przynajmniej singleton module)
15. **Dodać paginację** do `GET /projects`
16. **Dodać Dockerfile** dla reprodukowalnego środowiska
17. **Dodać Playwright/Cypress E2E testy** — minimum: generate flow, export flow
18. **Przeprowadzić audyt WCAG 2.1** — dostępność
19. **Dodać OpenAPI spec** dla backendu
20. **Napisać CHANGELOG.md** i ustalić versioning strategy
21. **Zaimplementować lazy loading** dla galerii szablonów
22. **Dodać structured logging** (np. winston/pino) zamiast console.log
23. **Skonfigurować Dependabot** dla automated security updates
24. **Dodać service worker update strategy** — powiadomienie o nowej wersji
25. **Przeprowadzić performance audit** — Lighthouse, Core Web Vitals

---

## APPENDIX — Pliki wymagające największej uwagi

| Plik | Problem | Priorytet |
|------|---------|-----------|
| `js/app.ts` | 318 błędów TS | 🔴 Krytyczny |
| `js/db.ts` | 84 błędy TS, `db: unknown` | 🔴 Krytyczny |
| `backend/src/db/firestore.js` | Race condition, inicjalizacja | 🔴 Krytyczny |
| `backend/README.md` | Opisuje nieistniejący SQLite | 🟡 Wysoki |
| `netlify.toml` | `unsafe-inline` w CSP | 🟡 Wysoki |
| `js/auth.ts` | 28 błędów TS, null refs | 🟡 Wysoki |
| `deploy.sh` | Placeholder URLs | 🟡 Wysoki |
| `package.json` | Node engine za szeroki | 🟡 Wysoki |

---

*Raport wygenerowany automatycznie na podstawie analizy kodu źródłowego projektu AgentSpark.*
