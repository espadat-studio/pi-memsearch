# pi-memsearch

## Tooling

`mise run setup` once, then `mise run check` (biome + dprint + tsc), `mise run fix`, `mise run test` (`node --test`).

The package has no build step: pi loads `extensions/*.ts` through jiti, so ship TypeScript source and use relative imports with explicit `.ts` extensions.

The site has one. `docs/` is a standalone Astro project with its own `package.json` and lockfile, outside every mise task, built by `.github/workflows/docs.yml`. Work on it with `npm --prefix docs ci` then `npm --prefix docs run build`.

Integration suite, test layout and the release process: `CONTRIBUTING.md`.

## Agent skills

### Issue tracker

GitHub Issues on `espadat-studio/pi-memsearch`, via the `gh` CLI. See `meta/agents/issue-tracker.md`.

### Triage labels

Canonical strings, unmodified. See `meta/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `meta/adr/` at the repo root. See `meta/agents/domain.md`.

### Runtime docs

`meta/runtime.md` is the event-by-event contract: hook-to-action ordering, every tunable constant, every degradation path. Read it before changing `src/`.

Changing runtime behavior means updating it in the same commit — a stale mechanism doc is worse than none, because agents read it as authoritative. `CONTRIBUTING.md` carries the change-to-doc mapping.
