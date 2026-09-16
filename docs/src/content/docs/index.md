---
title: pi-memsearch
description: "Long-term memory for pi: semantic recall over a memsearch store shared with Claude Code, Codex, OpenClaw and OpenCode."
---

> Long-term memory for pi, in a store your other coding agents already write to.

pi ships no memory by design: "primitives, not features". This package gives it long-term memory through [memsearch](https://zilliztech.github.io/memsearch/), the same per-project memory store Claude Code, Codex, OpenClaw and OpenCode already use. Memory is plain markdown under `.memsearch/`; the searchable collection is derived from it and rebuildable at any time.

## Features

- **Recall in the phrasing you use weeks later**: **32/35** strong hits against `pi-memory`'s **26/35**, over 35 queries on an identical 223-file corpus ([method and per-query results](https://github.com/espadat-studio/pi-memsearch/blob/master/meta/research/memsearch-vs-pi-memory-benchmark.md))
- **Cross-agent**: pi recalls what Claude Code learned yesterday in the same repo, and the reverse
- **Writes itself**: the `agent_settled` hook distils every content-bearing exchange into today's memory file, in the background, on the session provider's cheapest model
- **Three recall layers**: scored chunks, then the full section, then the turns around it in the origin transcript
- **Plain markdown**: commit `.memsearch/` to share memory with collaborators, or gitignore it to keep it personal
- **One external dependency**: [uv](https://docs.astral.sh/uv/). memsearch runs through `uvx`, so there is no Python packaging to manage

## Quick Start

```sh
pi install npm:pi-memsearch        # all projects
pi install npm:pi-memsearch -l     # this project only
```

First run downloads the onnx embedding model once, about 560 MB. It is announced as a notice so the pause is not mistaken for a hang. No API key is involved.

Then leave it alone. The memory writes itself, and answers weeks later:

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

## Where the rest lives

- [Install](/install/): prerequisites, the four install forms, first run, uninstall
- [Configuration](/configuration/): every `PI_MEMSEARCH_*` variable, and the line between pi's config and memsearch's own
- [Tools](/tools/): the seven tools, and the three-rung recall ladder
- [Memory store](/memory-store/): the daily markdown files, and which store a session writes to
- [Runtime](/runtime/): hook-by-hook behavior, every tunable, every degradation path
- [Troubleshooting](/troubleshooting/): start with `memory_status`
- [Limits](/limits/): what is deliberately unsupported, and how it compares to `pi-memory`
- [Development](/development/): the mise tasks, and the no-build-step jiti loading
