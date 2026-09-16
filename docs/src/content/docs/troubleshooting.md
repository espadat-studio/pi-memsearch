---
title: Troubleshooting
description: Start with memory_status, then the degradation table and the common symptoms.
---

## Start with `memory_status`

It is the one-step answer to "why doesn't search work". Ask for it in a session and it reports:

- whether `uv` and memsearch are present, and their versions
- the resolved scope and collection
- the index state, including memsearch's own `degraded` status and per-file failures, and the path it read the state file from
- the chunk count
- the last index failure
- the auto-context state, with its per-prompt skip counters

Nearly every symptom below is a line in that output.

## Without a backend, it degrades

A missing `uv` or memsearch never breaks a session:

| Surface                                            | Without the backend                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| Capture, `memory_write`                            | Still append to the daily memory file; the stable snapshot still reads it |
| `memory_search`, `memory_expand`, `memory_compact` | Return install instructions, not an error                                 |
| `memory_transcript`                                | Unaffected: L3 recall is a pure file read that never touches the backend  |
| Auto-context                                       | No injection; the prompt proceeds                                         |

Availability is re-probed with a short negative cache, so [installing `uv`](/install/) mid-session is picked up without a restart. Once the backend is back, the next index makes everything written in the meantime searchable.

The [store command](/store-command/) is the deliberate exception. When it is set and fails, resolution raises rather than degrading, because a silent fallback would write memory to the wrong store.

## Symptoms

| Symptom                                   | Likely cause                                                                               | Fix                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Search returns install instructions       | `uv` or memsearch missing                                                                  | Install [uv](https://docs.astral.sh/uv/); availability is re-probed mid-session |
| First search pauses ~10 s                 | One-time onnx model download                                                               | Wait, the notice announces it                                                   |
| A just-written memory is not found        | The debounced index (5 s after a write) has not run yet                                    | Retry in a moment; shutdown and session start also index                        |
| Search finds nothing after the repo moved | The collection name hashes the absolute path                                               | The next session start catch-up indexes into the new collection                 |
| Nothing is captured                       | `PI_MEMSEARCH_CAPTURE=off`, or the exchange failed a gate (no assistant text, aborted run) | [`memory_status`](#start-with-memory_status) shows the active config            |
| Auto-context injects nothing              | Budget misses (slow machine, remote provider), an empty collection, or the sidecar gave up | `memory_status` shows sidecar state and per-prompt skip counters                |

Every degradation path, and the two refusals that are configuration facts rather than transient ones: [the runtime page](/runtime/#degradation).
