---
title: Development
description: The mise tasks, the no-build-step jiti loading, and where the contributor guide lives.
---

`mise run setup` once — it installs the node dependencies and the `hk` git hooks. Never bypass the hooks; fix what they report.

| Task                        | Alias | What                                                                                    |
| --------------------------- | ----- | --------------------------------------------------------------------------------------- |
| `mise run check`            | `c`   | biome, dprint, tsc across the repo                                                      |
| `mise run fix`              | `f`   | Apply lint and format fixes                                                             |
| `mise run test`             | `t`   | Unit suite: deterministic, no backend, no network, no LLM                               |
| `mise run test:integration` | `ti`  | Real `uvx` and onnx round trip; needs `uv`, gated on `PI_MEMSEARCH_IT=1`, 5 min timeout |
| `mise run dev`              | `d`   | pi with the local extension loaded                                                      |

## No build step

pi loads `extensions/*.ts` through jiti, so the package ships TypeScript source rather than compiled output. Two consequences worth knowing before the first edit:

- relative imports carry explicit `.ts` extensions
- nothing is compiled, so `tsc` runs as a typechecker and emits no files

The site is the one exception. `docs/` is a standalone Astro project with its own `package.json` and lockfile, outside every mise task and built by its own workflow: `npm --prefix docs ci`, then `npm --prefix docs run build`.

## Going further

Test layout, the integration suite, the release process, and the rule that a PR changing runtime behavior updates [the runtime page](/runtime/) in the same commit: [`CONTRIBUTING.md`](https://github.com/espadat-studio/pi-memsearch/blob/master/CONTRIBUTING.md).
