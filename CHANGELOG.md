# Changelog

All notable changes to AgentSpark are documented here.

## [1.1.0] - 2026-03-01

### Added
- **Playground chat export** — Export full conversation as Markdown file (💾 button in Playground)
- **Enhanced ZIP export** — ZIP now includes README with Python/Node.js code examples, `config.json` with metadata, and example conversations
- **Dynamic template loading** — Gallery templates now loaded from `featured_templates.json` with live fetch fallback
- **Hospitality filter** — Restaurant Operations template now accessible via category filter in Gallery
- **`#results-fab`** — Floating scroll-to-top button on Results screen
- **`#projects-count-badge`** — Live project count badge in Projects screen header
- OG meta tags for better social sharing

### Fixed
- **Critical**: `DOMContentLoaded` syntax error (extra `}`) caused app to fail silently on load
- **High**: Onboarding modal appeared on `#share=` links — visitors saw wizard instead of shared project
- **High**: "Use Template" in Gallery only pre-filled topic — now loads full agent team to Results immediately
- **Medium**: `loadDemo()` didn't set `onboarding-done` flag — modal reappeared after demo
- **Medium**: All 3 API providers (Gemini, OpenAI, Anthropic) received chat history as plain text — now use proper `messages[]` array for real multi-turn context
- **Medium**: Playground sent history as concatenated string — agents lost context after a few turns
- **High**: Removed Gallery XSS vector by replacing unsafe string-based rendering with DOM-safe rendering + schema normalization
- **High**: Hardened AI message sanitization against script/event-handler based HTML injection
- **High**: Added `#share=` payload size limits + strict schema validation (`v`, structure, agent count)
- **Medium**: Fixed service worker offline fallback to return explicit `503 Offline` response instead of undefined

### Changed
- `deploy.yml` moved to `.github/workflows/deploy.yml` (correct location for GitHub Actions)
- Removed duplicate `gallery-addon.html` (identical to `gallery_feature.html`)
- `package.json` placeholder URLs updated
- GitHub Pages compatibility hardening: relative paths in manifest and runtime template fetch
- Added CI quality gate workflow (`lint` + `smoke` checks) and release readiness docs (`RELEASE_CHECKLIST`, `ROLLBACK_RUNBOOK`, regression template)

## [1.0.0] - 2026-01-15

### Initial Release
- AI interview → agent team generator
- Multi-provider support: Gemini, OpenAI, Anthropic, Mistral, Groq
- 8 Gallery templates
- Playground with multi-turn chat
- Projects via IndexedDB
- Version history with diff
- Export ZIP
- Share links
- PWA support
