# NEXT

## Top priorities

### 1 Raise Threads coverage or make orphans first class
Goal: reduce orphan reflections or surface them with clear operational labels in UI.

Deliverables:
A deterministic auto tune path that tries to reach a target coverage
A clear Orphans panel that is helpful, not shameful
Provenance toggle remains available for debugging

### 2 Lock a release marker for Insights v1
Deliverables:
CHANGELOG entry for the completion milestone
One paragraph milestone summary for PR or Notion
Optional git tag for Insights v1

### 3 Harden invariants in code review flow
Deliverables:
A small checklist in PR template referencing `docs/INVARIANTS.md`
At least one quick regression test for deterministic bridge output

## Blockers

Lockfile conflict: Both `package-lock.json` and `pnpm-lock.yaml` exist. Choose one strategy and remove the other. Logged on 2026-01-20.

Build blocker: pnpm build fails with `EPERM: operation not permitted, open '/Users/kiran/dev/story-of-emergence/node_modules/.pnpm/next@16.1.3_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/client/components/router-reducer/create-href-from-url.js'`. Logged on 2026-01-20.
