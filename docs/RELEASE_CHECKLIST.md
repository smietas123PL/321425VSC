# AgentSpark Release Checklist (v1.1.0)

## Scope Freeze
- [ ] Feature freeze confirmed (bugfix/security/perf only).
- [ ] No open High/Critical findings.
- [ ] Release candidate branch prepared (`release/1.1.0-rc`).

## Security Hardening
- [ ] Gallery template rendering uses safe DOM APIs (no untrusted inline handlers).
- [ ] `featured_templates.json` records are schema-validated before use.
- [ ] AI rich text output is sanitized before `innerHTML`.
- [ ] Share URL payload enforces schema version and size limits.

## Hosting and PWA
- [ ] Relative paths verified for GitHub Pages repo path.
- [ ] `manifest.json` uses relative `start_url`, icons and shortcuts.
- [ ] Service worker fallback returns explicit offline `Response`.
- [ ] Smoke test on GitHub Pages preview passes.

## CI Quality Gates
- [ ] `.github/workflows/ci.yml` passes on PR and `main`.
- [ ] `npm run lint` passes.
- [ ] `npm run smoke` passes.

## Manual Regression
- [ ] Onboarding flow works.
- [ ] Interview to generation flow works.
- [ ] Gallery filter/search/detail/fork works (local + fetched templates).
- [ ] Share create/copy/load works (valid + invalid hashes).
- [ ] ZIP export works.
- [ ] Project save/load works.
- [ ] Playground chat works.
- [ ] PWA install/offline works.

## Observability
- [ ] Event schema emits: `app_loaded`, `team_generated`, `export_zip`, `share_created`, `share_loaded`, `runtime_error`.
- [ ] No sensitive data is sent in telemetry payloads.
- [ ] Runtime error hook captures uncaught errors and unhandled rejections.

## Release Artifacts
- [ ] `CHANGELOG.md` updated.
- [ ] Git tag prepared: `v1.1.0`.
- [ ] GitHub Release draft prepared with known issues.
- [ ] Regression report attached (`docs/REGRESSION_TEST_REPORT.md`).
- [ ] Rollback runbook reviewed (`docs/ROLLBACK_RUNBOOK.md`).

## Production Go/No-Go
- [ ] Go if all critical scenarios pass and no High/Critical remains.
- [ ] No-Go if any critical flow fails or runtime errors spike after deploy.
