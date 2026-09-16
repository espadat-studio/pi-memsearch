<div align="center">

# pi-memsearch

[![npm](https://img.shields.io/npm/v/pi-memsearch?logo=npm&logoColor=white&label=npm)](https://www.npmjs.com/package/pi-memsearch)
[![ci](https://img.shields.io/github/actions/workflow/status/espadat-studio/pi-memsearch/master.yml?branch=master&logo=githubactions&logoColor=white&label=ci)](https://github.com/espadat-studio/pi-memsearch/actions/workflows/master.yml?query=branch%3Amaster)

**[pi-memsearch.espadat.com](https://pi-memsearch.espadat.com)**

</div>

> Long-term memory for pi, in the store your other coding agents already write to.

Every pi session starts from zero. pi ships no memory by design ("primitives, not features"), so this package adds it. Each session writes what it learned to a memory file, and weeks later pi finds it again by meaning, in whatever words you use then. The store is the same per-project one Claude Code, Codex, OpenClaw and OpenCode write through [memsearch](https://zilliztech.github.io/memsearch/).

- **Recall in the phrasing you use weeks later**: **32/35** strong hits vs **26/35** for `pi-memory`'s qmd backend, over 35 queries against an identical 223-file corpus ([benchmark](https://github.com/espadat-studio/pi-memsearch/blob/master/meta/research/memsearch-vs-pi-memory-benchmark.md)).
- **Cross-agent**: pi recalls what Claude Code learned yesterday in the same repo, and vice versa.
- **Plain markdown** under `.memsearch/`, yours to commit or gitignore.

The memory writes itself, then answers weeks later:

```text
# .memsearch/memory/2026-08-13.md  ← written by the session, unprompted
### 22:41
- the user and the agent moved the hot cache to Redis with 5 minute TTLs

# a new session, three weeks on
you ▸ /recall how did we fix the flaky redis test?
pi  ▸ memory_search → 5 chunks; top: 2026-08-13 "moved the hot cache to Redis with 5 minute TTLs" (0.81)
      memory_expand → the full "### 22:41" section, with its session anchor
      → answered at layer 2; the origin transcript was never opened
```

## Install

Current release: [1.4.3](https://github.com/espadat-studio/pi-memsearch/blob/master/CHANGELOG.md). <!-- x-release-please-version -->

Needs [uv](https://docs.astral.sh/uv/), the only external dependency, plus pi >= 0.84.1 and Node >= 22.19.

```sh
pi install npm:pi-memsearch
```

The first run downloads the onnx embedding model once, about 560 MB. pi announces it as a notice, so the pause is not mistaken for a hang. No API key is involved.

Project-local, pinned and unreleased installs, and what survives an uninstall: [the install guide](https://pi-memsearch.espadat.com/install/).

## Documentation

Everything is at **[pi-memsearch.espadat.com](https://pi-memsearch.espadat.com)**:

- [Install](https://pi-memsearch.espadat.com/install/): prerequisites, the four install forms, first run, uninstall
- [Configuration](https://pi-memsearch.espadat.com/configuration/): every `PI_MEMSEARCH_*` variable, with its default and effect
- [Tools](https://pi-memsearch.espadat.com/tools/): the seven tools, and the three-rung recall ladder
- [Memory store](https://pi-memsearch.espadat.com/memory-store/): the daily markdown files, and which store a session writes to
- [Runtime](https://pi-memsearch.espadat.com/runtime/): hook-by-hook behavior, every tunable, every degradation path
- [Troubleshooting](https://pi-memsearch.espadat.com/troubleshooting/): start with `memory_status`
- [Limits](https://pi-memsearch.espadat.com/limits/): what is deliberately unsupported, and how it compares to `pi-memory`
- [Development](https://pi-memsearch.espadat.com/development/): the mise tasks, and the no-build-step jiti loading

In the repo: [`CONTEXT.md`](https://github.com/espadat-studio/pi-memsearch/blob/master/CONTEXT.md) for the vocabulary, and [`meta/adr/`](https://github.com/espadat-studio/pi-memsearch/tree/master/meta/adr) for the decisions and their rejected alternatives. Mesh parity ([ADR 0001](https://github.com/espadat-studio/pi-memsearch/blob/master/meta/adr/0001-mesh-parity.md)) constrains the rest.

## Development

`mise run setup`, then `mise run check` / `test` / `dev`. Task reference, test layout and the release process: [the development page](https://pi-memsearch.espadat.com/development/) and [`CONTRIBUTING.md`](https://github.com/espadat-studio/pi-memsearch/blob/master/CONTRIBUTING.md).
