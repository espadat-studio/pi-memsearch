---
title: Limits
description: What pi-memsearch deliberately does not support, and how it compares to pi-memory.
---

## Unsupported

- **Running alongside `pi-memory`.** Both capture every exchange and both inject context. Pick one; the comparison below is what to read when choosing.
- **Milvus Server and Zilliz Cloud.** Milvus Lite only.
- **Windows.** milvus-lite ships no Windows wheels. Use WSL2.
- **A forked or patched memsearch.** The package orchestrates the released CLI and invents no memory format of its own. Parity with the rest of the mesh is the constraint the whole design answers to ([ADR 0001](https://github.com/espadat-studio/pi-memsearch/blob/master/meta/adr/0001-mesh-parity.md)), and a fork would break the store other agents read.

## Compared to `pi-memory`

`pi-memory`, the existing community option, delegates search to [qmd](https://github.com/tobilu/qmd) and keeps its store user-global at `~/.pi/agent/memory`.

|                                     | pi-memsearch | `pi-memory` |
| ----------------------------------- | ------------ | ----------- |
| Search backend                      | memsearch    | qmd         |
| Strong hits, 35 queries / 223 files | **32/35**    | 26/35       |
| Store scope                         | per git root | user-global |

They tie on short keyword queries. memsearch wins on paraphrased and natural-question recall, the phrasing you actually use when asking "how did we fix X?" three weeks later. Method and per-query results: [the benchmark](https://github.com/espadat-studio/pi-memsearch/blob/master/meta/research/memsearch-vs-pi-memory-benchmark.md).

The other difference is not measurable in hit rates. memsearch already integrates Claude Code, OpenClaw, OpenCode and Codex CLI, all sharing one markdown format and one collection-name derivation. This package joins pi to that mesh rather than giving it a private store.
