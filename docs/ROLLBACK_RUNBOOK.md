# AgentSpark Rollback Runbook (GitHub Pages)

## Purpose
Restore the previous stable release quickly when production quality or security degrades after deployment.

## Preconditions
- Stable fallback tag exists (for example `v1.0.0`).
- GitHub Pages deployment workflow is healthy.
- Team has access to repository Actions and Releases.

## Rollback Triggers
- High/Critical issue detected post-release.
- Core flow broken: app load, generation, share load, ZIP export, project load.
- Runtime errors spike and impact users.

## Rollback Procedure
1. Identify the last stable tag (example: `v1.0.0`).
2. Create rollback branch from stable tag:
   - `git checkout v1.0.0`
   - `git checkout -b rollback/v1.1.0-to-v1.0.0`
3. Push rollback branch and open PR to `main`.
4. Merge PR after smoke checks pass.
5. Trigger GitHub Pages deploy workflow for updated `main`.
6. Verify production smoke:
   - App boot
   - Generate team
   - Share load
   - ZIP export
7. Announce rollback completion and incident status.

## Verification Checklist
- [ ] Site serves stable version content.
- [ ] Browser console free of new critical errors.
- [ ] Core conversion flow operational.
- [ ] Monitoring error rate back to baseline.

## Incident Follow-up
1. Freeze new deploys until root cause is fixed.
2. Open incident ticket with:
   - timeline
   - impact
   - root cause
   - corrective actions
3. Prepare patch release and test via CI + regression checklist.
4. Re-release only after explicit Go decision.
