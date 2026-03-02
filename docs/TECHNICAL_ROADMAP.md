# 🛠 AgentSpark — Roadmapa Techniczna

## Status Update (2026-03-02)

### Zrealizowane w tym repo
- ✅ Backend API (`backend/`) działa jako Express + SQLite z route'ami `/api/v1/auth`, `/api/v1/projects`, `/api/v1/generate`.
- ✅ Rate limiting backend (`globalLimiter`, `generateLimiter`, `authLimiter`).
- ✅ Walidacja projektu i limit `max 100 agents`.
- ✅ Audit log (`audit_log`) dla akcji auth/projects/generate.
- ✅ API key storage po stronie frontendu przeniesiony do `sessionStorage` (z migracją legacy key z `localStorage`).
- ✅ Usunięty hardcoded RevenueCat test key z frontendu (`js/auth.js`) i zastąpiony konfiguracją runtime.
- ✅ Dodana opcjonalna weryfikacja HMAC requestu (`REQUEST_HMAC_SECRET`, nagłówki `X-Timestamp`, `X-Signature`) dla `/api/v1/generate`.
- ✅ Wdrożony tryb kluczy `KEY_MODE=hybrid|env|byok` w backend proxy (preferencja klucza serwerowego z fallbackiem BYOK).
- ✅ UX hardening: modal `uiConfirm(...)` zamiast kluczowych `window.confirm(...)` oraz blokada wielokrotnego kliknięcia podczas generacji.
- ✅ Frontend auth przełączony na backend (`/api/v1/auth/register|me|logout`) z trwałym tokenem lokalnym.
- ✅ Frontend cloud sync przełączony na backend (`/api/v1/projects`) z merge local↔cloud po `updatedAt`.
- ✅ Etap 2 modularyzacji rozpoczęty: wydzielone `js/core/api-client.js`, `js/core/generation-client.js`, `js/ui/confirm.js`, `js/features/share.js` i `js/features/playground.js`, podpięte do `index.html`.

### Nadal otwarte (P0/P1)
- ✅ Frontend generacji jest przełączony na backend proxy `/api/v1/generate` (BYOK przekazywany per-request).
- ⏳ Brak pełnej integracji OAuth Google po stronie backend (obecnie uproszczony flow).
- ⏳ Brak kolejkowania zmian offline do sync (na teraz: manualny sync po zalogowaniu).
- ⏳ Dalsza redukcja monolitu `js/app.js` (kolejne wydzielenia: `results-render.js`, `pwa.js`, `share-loader.js`).

## Audyt Stanów Obecnego (v1.1.0)

### ✅ Co Działa
- **Architektura:** Vanilla JS + PWA (Service Worker, Web Manifest)
- **Storage:** IndexedDB dla lokalnych projektów
- **Multi-model:** Obsługa 5 providersów (OpenAI, Anthropic, Groq, Mistral, Gemini)
- **Export:** Markdown, ZIP (z kodem), CrewAI (Python)
- **Offline:** Service Worker cache strategy (cache-first)
- **I18n:** Partial PL/EN translations (app.js, UI)
- **Responsive:** Mobile-first design (PWA ready)

### ⚠️ Problemy Techniczne

#### SECURITY (KRYTYCZNE)
- ❌ API keys przechowywane w localStorage — zagrożenie XSS
- ❌ Brak input validation/sanitization
- ❌ Brak CSP (Content Security Policy) headers
- ❌ Test API key widoczny w auth.js (RevenueCat)
- ❌ Brak rate limiting (tylko klient-side)

#### BACKEND (BRAKUJE)
- ❌ Istniejące: frontend-only, brak API serwera
- ❌ Brak authentication (tylko RevenueCat placeholder)
- ❌ Brak user account system (nie ma gdzie przechowywać dane)
- ❌ Brak cloud sync — każdy device to osobne projekty
- ❌ Brak telemetry/monitoring

#### UX (TECHNICZNE DŁUGI)
- ⚠️ app.js 5992 linii — monolityczna struktura
- ⚠️ Brak TypeScript — trudno skalować
- ⚠️ Brak modularyzacji (import/export)
- ⚠️ Error handling: alert() zamiast UI errors
- ⚠️ Brak loading states na API calls
- ⚠️ Brak error boundaries

#### PERFORMANCE
- ⚠️ Bundle size: ~150KB minified (do optymalizacji)
- ⚠️ Brak code splitting
- ⚠️ Brak lazy loading components
- ⚠️ Service Worker cache — brak stale-while-revalidate
- ⚠️ Images nie są optimized (PNG zamiast WebP)

#### FEATURES (BACKLOG)
- ❌ Community templates: hardcoded JSON (gallery.js)
- ❌ Team collaboration: brak sync, CRDT
- ❌ API mode: brak REST API dla automation
- ❌ More export formats: LangChain, AutoGen

---

## 📋 Roadmapa Techniczna v1.2.0–v1.4.0

### 🔴 v1.2.0 — SECURITY + BACKEND MVP (Q2 2026)
**Focus:** Secure API handling + podstawowy backend

#### Security Hardening (Sprint 1)
- [ ] **Backend API proxy** (Node.js/Express starter)
  - Endpoint: `/api/generate` — wrapper dla LLM calls
  - Proxy encryption API keys (env variables, nie klient)
  - Rate limiting: 10 req/min per IP
  - Request verification (HMAC signature)
  
- [ ] **Frontend API key improvements**
  - Shift API calls through backend proxy
  - sessionStorage zamiast localStorage (keys are session-only)
  - Encryption layer (TweetNaCl.js) dla client-side keys (optional)
  - ⚠️ KOMUNIKAT: "Your API key is never sent to our servers"
  
- [ ] **CSP Headers + Security Policies**
  - Manifest CSP w meta tags + server headers
  - Whitelist: fonts.googleapis.com, cdnjs.cloudflare.com
  - Disable inline scripts (except minimal)
  
- [ ] **Input Validation**
  - Sanitize ALL JSON inputs (DOMPurify)
  - Validate project schema na save
  - Rate limit: max 100 agents per project
  
- [ ] **Auth.js refactor**
  - Remove test keys (use .env)
  - RevenueCat → placeholder dla future integration

#### Backend MVP (Sprint 2)
- [ ] **Setup Node.js backend** (Express + SQLite)
  ```
  backend/
    ├── server.js (Express, CORS, rate-limit)
    ├── .env (API keys, secrets)
    ├── routes/
    │   ├── generate.js (LLM proxy)
    │   ├── auth.js (OAuth Google)
    │   └── projects.js (CRUD)
    ├── middleware/
    │   ├── auth.js (verify JWT)
    │   ├── rateLimiter.js
    │   └── validation.js
    └── db/
        └── schema.sql (users, projects, audit_log)
  ```

- [ ] **User Authentication**
  - OAuth Google integration (Google Cloud Console setup)
  - JWT tokens (HttpOnly cookies)
  - User table: `id | email | name | createdAt`
  
- [ ] **Projects API**
  - `POST /api/v1/projects` — create
  - `GET /api/v1/projects` — list (authenticated)
  - `PUT /api/v1/projects/:id` — update
  - `DELETE /api/v1/projects/:id` — delete
  - Backend stores: full project JSON + updatedAt
  
- [ ] **LLM Call Proxy**
  - `POST /api/v1/generate` — all calls go here
  - Backend manages API keys
  - Logging: request, model, tokens used (audit_log table)
  - Error handling: return 5xx errors to client
  
- [ ] **Deployment**
  - Deploy backend: Render.com (free tier) lub Railway
  - DB: SQLite (file storage, replicate locally)
  - Add `.env` file (NEVER commit API keys)

#### UX Polish (Sprint 3)
- [ ] **Code modularization** (NO TypeScript yet)
  - Split app.js → modules:
    ```
    js/
      ├── core/
      │   ├── state.js (global state)
      │   ├── api.js (all API calls)
      │   └── store.js (localStorage/IndexedDB)
      ├── ui/
      │   ├── screens.js (render functions)
      │   ├── modals.js
      │   └── drawer.js
      ├── features/
      │   ├── generator.js (question flow)
      │   ├── export.js (keep current)
      │   ├── gallery.js (keep current)
      │   └── projects.js (local + cloud)
      └── utils/
          ├── i18n.js (exist)
          └── validation.js (new)
    ```
  
- [ ] **Better error handling**
  - Create error.js (custom error class)
  - UI error modal zamiast alert()
  - Error logging (telemetry) na backend
  - Retry logic dla failed API calls
  
- [ ] **Loading states**
  - Add spinner component (CSS-only, no external lib)
  - Disable buttons during API calls
  - Progress bar dla long generations
  
- [ ] **Offline + Sync**
  - Detect online/offline (navigator.onLine)
  - Queue offline edits → sync on reconnect
  - Show "syncing..." indicator
  
- [ ] **Accessibility (WCAG 2.1 AA)**
  - aria-labels na wszystkie buttons
  - Keyboard navigation (Tab, Enter, Esc)
  - Skip links
  - Alt text dla icons

---

### 🟡 v1.3.0 — PERFORMANCE + DX (Q3 2026)
**Focus:** Bundle optimization + developer experience

#### Migration to TypeScript (Sprint 1)
- [ ] **Setup TypeScript** (tsconfig.json)
  ```json
  {
    "target": "ES2020",
    "module": "ES2020",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "esModuleInterop": true
  }
  ```
- [ ] **Migrate modules one-by-one**
  - Phase 1: utils/ → type all functions
  - Phase 2: core/ → add interfaces
  - Phase 3: ui/ → component types
  - Phase 4: features/ → full types
- [ ] **Setup build pipeline** (esbuild or Vite)
  - Dev: `npm run dev` → local server + HMR
  - Build: `npm run build` → minified es/ + source maps
  - Bundle analysis: `npm run analyze`

#### Performance Optimization (Sprint 2)
- [ ] **Code splitting**
  - Lazy load gallery templates (load on demand)
  - Lazy load export formats (CrewAI, LangChain when opened)
  - Split CSS → core.css (critical) + feature-*.css
  
- [ ] **Image optimization**
  - Convert PNG icons → WEBP + fallback
  - Add srcset dla responsive images
  - Use SVG kde možliwe
  
- [ ] **Caching strategy**
  - Service Worker: cache-first dla JS/CSS, stale-while-revalidate dla API
  - Manifest versioning: use hash (bundle-v123.js)
  - Max cache age: 30 days
  
- [ ] **Bundle analysis**
  - Install: `npm install --save-dev @esbuild-plugins/webpack-bundle-analyzer`
  - Find heavy dependencies (CrewAI export is large)
  - Reduce jszip size if possible
  
- [ ] **Metrics**
  - Core Web Vitals: LCP < 2.5s, CLS < 0.1, FID < 100ms
  - Add Sentry integration (error tracking)
  - Track performance: time to interactive, API latency

#### Backend Enhancements (Sprint 3)
- [ ] **Database improvements**
  - Migrate to PostgreSQL (Render free tier) or keep SQLite with replication
  - Add indexes: `projects(userId, updatedAt)`, `users(email)`
  - Backup strategy: daily exports to cloud storage
  
- [ ] **API versioning**
  - Prefix all routes: `/api/v1/` (prepare for v2)
  - Changelog: `docs/API_CHANGELOG.md`
  
- [ ] **Analytics (privacy-first)**
  - Plausible.io integration (frontend)
  - Track: feature usage, export format popularity, errors
  - NO personal data: aggregate stats only
  
- [ ] **Documentation**
  - Backend API docs: OpenAPI/Swagger
  - Deployment guide: `docs/DEPLOYMENT.md`
  - Architecture diagram: `docs/ARCHITECTURE.md`

---

### 🟢 v1.4.0 — ADVANCED FEATURES (Q4 2026)
**Focus:** Community + Collaboration

#### Community Feature (Sprint 1)
- [ ] **Template submission system**
  - New DB table: `community_templates` (id | userId | name | agents | updatedAt | approved)
  - Admin dashboard (private) dla approval workflows
  - Frontend: "Submit to community" button in results UI
  - API: `POST /api/v1/community/templates`
  
- [ ] **Gallery refactor**
  - Migrate from hardcoded JSON → database queries
  - Load featured templates on startup
  - Search + filter: category, difficulty, tags
  - Pagination (lazy load)
  
- [ ] **User profiles (basic)**
  - Public profile: `/profiles/:userId`
  - Show submitted templates
  - Template stats: forks, downloads

#### Team Collaboration MVP (Sprint 2)
- [ ] **Shared projects**
  - New permission model: owner | editor | viewer
  - DB table: `project_shares` (projectId | userId | role)
  - API: `POST /api/v1/projects/:id/share`
  
- [ ] **Real-time sync** (WebSockets)
  - Use Socket.io na backend
  - Sync agent edits across users in real-time
  - Conflict resolution: last-write-wins (simple)
  - Frontend: show "editing..." indicator
  
- [ ] **Comments on agents** (basic)
  - DB table: `agent_comments` (agentId | userId | text | createdAt)
  - Show comments in results view

#### API Mode (Sprint 3)
- [ ] **REST API for generation**
  - `POST /api/v1/generate` (requires auth)
  - Body:
    ```json
    {
      "topic": "e-commerce support",
      "level": "intermediate",
      "count": 3,
      "format": "json|markdown|crewai"
    }
    ```
  - Response: agents array
  - Rate limit: 100 req/day per free user
  
- [ ] **Documentation**
  - Swagger/OpenAPI spec
  - Example curl commands
  - SDK starter (Python, JS)
  
- [ ] **Webhooks** (future)
  - Allow users to subscribe to events (template created, etc.)
  - Endpoint: `POST /api/v1/webhooks`

---

## 🎯 Priority Matrix

### Immediate (v1.2.0)
| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Backend proxy | 🔴 Security | 3d | P0 |
| API key encryption | 🔴 Security | 2d | P0 |
| CSP headers | 🟣 Security | 1d | P0 |
| Code modularization | 🟣 Maintainability | 5d | P1 |
| Error UI | 🔵 UX | 2d | P1 |
| User auth | 🔵 Feature | 3d | P1 |

### Medium-term (v1.3.0–v1.4.0)
| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| TypeScript migration | 🟣 DX | 10d | P2 |
| Bundle optimization | 🟡 Performance | 3d | P2 |
| Community templates | 🔵 Feature | 5d | P2 |
| Real-time collab | 🟢 Feature | 7d | P3 |

---

## 🏗 Architektura (po v1.2.0)

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (PWA)                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Browser (TypeScript modules)                    │    │
│  │  ├─ ui/ (React-like patterns)                   │    │
│  │  ├─ features/ (business logic)                  │    │
│  │  ├─ core/ (state, auth, API)                   │    │
│  │  └─ utils/ (helpers, i18n, validation)         │    │
│  │                                                  │    │
│  │ Web Storage: IndexedDB (projects) + SessionStr │    │
│  │ Service Worker (offline, caching)              │    │
│  └─────────────────────────────────────────────────┘    │
│                          ▼                               │
├──────────────────┬────────────────┬──────────────────┤
│   Backend API    │                │                  │
├──────────────────┴────────────────┴──────────────────┤
│               Express Server (Node.js)               │
│  ┌──────────────────────────────────────────────┐   │
│  │ Routes:                                      │   │
│  │  ├─ POST /api/v1/generate (LLM proxy)       │   │
│  │  ├─ POST /api/v1/projects (CRUD + sync)     │   │
│  │  ├─ POST /auth/google (OAuth + JWT)         │   │
│  │  └─ WS /socket (real-time collab)           │   │
│  │                                              │   │
│  │ Middleware: auth, rate-limit, validation    │   │
│  └──────────────────────────────────────────────┘   │
│                      ▼                               │
│  ┌──────────────────────────────────────────────┐   │
│  │ Database (PostgreSQL / SQLite)               │   │
│  │  ├─ users (auth)                            │   │
│  │  ├─ projects (user projects + metadata)     │   │
│  │  ├─ community_templates (v1.4.0)            │   │
│  │  ├─ audit_log (security events)             │   │
│  │  └─ analytics (anonymous usage data)        │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  Env Variables:                                      │
│  ├─ LLM_API_KEYS (OpenAI, Anthropic, etc.)         │
│  ├─ GOOGLE_OAUTH_* (auth)                          │
│  ├─ JWT_SECRET (tokens)                             │
│  └─ DATABASE_URL (DB connection)                    │
└──────────────────────────────────────────────────────┘

External Services (Calls from backend):
├─ OpenAI API (proxy)
├─ Anthropic API (proxy)
├─ Groq API (proxy)
├─ Mistral API (proxy)
└─ Google OAuth (auth)
```

---

## 📊 Metryki Sukcesu

### Security
- [ ] Zero XSS vulnerabilities (OWASP Top 10 scan)
- [ ] 0 hardcoded secrets (secret scanning + git hooks)
- [ ] 100% API calls proxied (no client-side keys)
- [ ] CSP violations: 0

### Performance
- [ ] LCP < 2.5s
- [ ] CLS < 0.1
- [ ] FID < 100ms
- [ ] Bundle size < 100KB (gzip)

### UX
- [ ] Error messages: 100% covered (no more alert())
- [ ] Accessibility: WCAG 2.1 AA compliance
- [ ] Mobile: 98+ Lighthouse score
- [ ] Offline mode: 95% features work

### Feature Adoption
- [ ] v1.2.0: 50% users on authenticated accounts
- [ ] v1.3.0: <2.5s average load time
- [ ] v1.4.0: 100+ community templates submitted

---

## 🔗 Zależności (Będą dodane)

### Backend
```
npm init -y
npm install express cors dotenv
npm install sqlite3 # lub pg dla PostgreSQL
npm install jsonwebtoken passport-google-oauth20
npm install express-rate-limit helmet
npm install socket.io # (v1.4.0)
npm install --save-dev nodemon
```

### Frontend
```
npm install typescript @types/node
npm install --save-dev esbuild
npm install dompurify # input validation
npm install sentry-browser # error tracking (v1.3.0)
```

---

## 📅 Timeline Szacunkowy

| Wersja | Okres | Fazy | Effort |
|--------|-------|------|--------|
| v1.2.0 | Q2 2026 | Security + Backend MVP | 30d |
| v1.3.0 | Q3 2026 | TypeScript + Performance | 25d |
| v1.4.0 | Q4 2026 | Community + Collab | 20d |

**Total: ~75 dni (3 miesiące) przy 1 dev full-time**

---

## 🎓 Next Steps

1. **Review & Approve** — CTO review tej roadmapy
2. **Setup Backend** — Initialize server repo + deployment
3. **Security Audit** — External pen test (Q2 end)
4. **Sprint Planning** — 2-week sprints, Jira/GitHub issues
5. **Team Communication** — Share roadmap z community (Discord, Twitter)
