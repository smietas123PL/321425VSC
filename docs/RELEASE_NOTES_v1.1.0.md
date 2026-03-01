# Release Notes Draft - v1.1.0

## Highlights
- Security hardening for Gallery rendering and AI rich text output.
- Hardened share-link parser with payload schema validation and size limits.
- GitHub Pages compatibility improvements via relative paths.
- CI quality gates added (`lint` + release smoke checks).
- Release operations docs added (checklist, rollback runbook, regression report template).

## Security
- Removed string-based gallery rendering path that allowed untrusted HTML injection.
- Added strict sanitizer for AI-rendered rich text.
- Added bounded share hash decoding and schema validation (`v` enforced).

## Reliability
- Service worker now returns explicit offline fallback response.
- Added runtime error telemetry event hooks.

## Operations
- Added `docs/RELEASE_CHECKLIST.md`.
- Added `docs/ROLLBACK_RUNBOOK.md`.
- Added `docs/REGRESSION_TEST_REPORT.md`.
- Added `docs/OBSERVABILITY.md`.

## Known Issues
- Existing localStorage API key storage remains for backward compatibility.
