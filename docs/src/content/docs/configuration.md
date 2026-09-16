---
title: Configuration
description: "Every PI_MEMSEARCH_* variable with its default and effect, and the line between pi-local config and memsearch's own."
---

Configuration lives on two surfaces, deliberately separate.

| Surface                | Holds                                                                                       | Where                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| memsearch's own config | Everything shared with the mesh: embedding provider and model, chunking, the compaction LLM | `~/.memsearch/config.toml`, with a project `.memsearch.toml` layered over it |
| pi-local environment   | Only how pi drives memsearch                                                                | the `PI_MEMSEARCH_*` variables below                                         |

Anything that changes what the store looks like to another agent belongs upstream in memsearch's config, so Claude Code, Codex, OpenClaw, OpenCode and pi keep reading one store the same way ([ADR 0001, mesh parity](https://github.com/espadat-studio/pi-memsearch/blob/master/meta/adr/0001-mesh-parity.md)). pi-memsearch adds no config of its own for those.

## Variables

| Variable                          | Default                                | Effect                                                                                                                                                                                              |
| --------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PI_MEMSEARCH_CAPTURE`            | on                                     | `off` disables automatic capture; `memory_write` keeps working                                                                                                                                      |
| `PI_MEMSEARCH_CAPTURE_MODEL`      | cheapest model of the session provider | Distillation model, as `<id>` or `<provider>/<id>`                                                                                                                                                  |
| `PI_MEMSEARCH_SNAPSHOT`           | on                                     | `off` disables snapshot injection                                                                                                                                                                   |
| `PI_MEMSEARCH_AUTO_CONTEXT`       | off                                    | `on` enables per-prompt injection via a warm sidecar (~1 GB resident)                                                                                                                               |
| `PI_MEMSEARCH_SEARCH_TIMEOUT_MS`  | `30000`                                | Per-attempt timeout for `memory_search` (each cross-repo invocation too)                                                                                                                            |
| `PI_MEMSEARCH_COMPACT_TIMEOUT_MS` | `300000`                               | Per-attempt timeout for `memory_compact` (LLM pass plus reindex)                                                                                                                                    |
| `PI_MEMSEARCH_SCAN_ROOTS`         | unset                                  | `:`-separated directory roots scanned for other projects' memory stores; required by cross-repo recall                                                                                              |
| `PI_MEMSEARCH_STORE_CMD`          | unset                                  | Command printing the store path (`memory-dir`), the collection (`collection`) and optionally the index-state dir (`state-dir`); outranks `MEMSEARCH_DIR`. [Contract and reference](/store-command/) |
| `MEMSEARCH_DIR`                   | unset                                  | memsearch's own scope override; the memory store and collection follow it. A relative path resolves where the memsearch children run                                                                |

`MEMSEARCH_DIR` is the one entry that is not pi's. It is memsearch's own variable, listed here because pi mirrors its resolution order exactly rather than inventing a second one.

## Auto-context

Off by default, and the only setting with a standing cost.

While it is on, a per-session sidecar holds the embedding model warm and takes 0.7 to 1.0 GB of resident memory. Every prompt gets a 300 ms hard cap. A deadline miss, an empty result or a locked store all degrade to no injection, so a prompt never waits on memory.

Remote embedding providers will often miss that cap. Three consecutive misses count as a crash, and past the respawn cap auto-context switches off for the rest of the session rather than spending 300 ms on every prompt.

Every tunable constant, and how the sidecar borrows the Milvus Lite lock for milliseconds at a time: [the runtime page](/runtime/#auto-context).
