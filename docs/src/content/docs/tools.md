---
title: Tools
description: The seven memory tools, and the three-rung recall ladder that three of them form.
---

Most of what pi-memsearch does happens without being asked. The tools are the part you or the agent reach for deliberately.

## Surfaces

| Surface          | pi mechanism                             | Behavior                                                                                                                          |
| ---------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Capture          | `agent_settled` hook                     | Distills every content-bearing exchange into the daily memory file, in the background, with the session provider's cheapest model |
| Deliberate write | `memory_write` tool                      | Persists a memory immediately, on request                                                                                         |
| Indexing         | `session_start` / write / shutdown       | Catch-up index, debounced index 5 s after a write, final index at shutdown                                                        |
| Recall           | `/recall`, recall skill, three tools     | The ladder below; `/recall --all` widens across projects                                                                          |
| Skill drafting   | `skill-drafting` skill                   | Turns remembered work into skill candidates in memsearch's git-tracked store; installs only on request                            |
| Redaction        | `memory_forget` tool                     | Removes one entry from the daily memory file and, via reindex, the collection; no recovery record, no audit log                   |
| Maintenance      | `memory_compact` tool                    | Memory compaction on request: an LLM condenses the store into today's daily memory file                                           |
| Stable snapshot  | `before_agent_start` hook                | Recent memory appended to the system prompt, byte-identical between checkpoints                                                   |
| Auto-context     | `before_agent_start` hook + warm sidecar | Opt-in: top memory chunks injected per prompt within a 300 ms budget                                                              |

## The recall ladder

Three tools are one mechanism read at three depths. `/recall <query>`, or the agent reaching for the auto-discoverable recall skill on its own, starts at the cheapest rung and stops at the first one that answers the question.

**L1, `memory_search`** casts wide: the top-k scored chunks, five by default, each carrying a chunk hash. It costs one embedder load, which is the expensive part of recall. Most questions end here, because a distilled bullet is usually the whole answer.

**L2, `memory_expand`** takes a chunk hash and returns the entire section it came from, plus that section's session anchor. No embedder, so it is cheap. Reach for it whenever a chunk is suggestive but clipped.

**L3, `memory_transcript`** takes the anchor and returns the turns around that entry in the origin transcript, following the branch the memory anchors to even past a later fork. It is a pure file read and never touches the search backend, so L3 keeps working when memsearch is unavailable. It exists because a distilled bullet sometimes loses the reasoning that produced a decision ([ADR 0006](https://github.com/espadat-studio/pi-memsearch/blob/master/meta/adr/0006-l3-transcript-tool.md)).

Each rung returns more text than the one above it, which is why recall climbs down deliberately instead of one call returning everything. A question answered at L1 never loads a transcript, and a session that always loaded them would spend its context window on conversations it did not need.

| Layer | Tool                | Returns                                                                                                | Cost               |
| ----- | ------------------- | ------------------------------------------------------------------------------------------------------ | ------------------ |
| L1    | `memory_search`     | Top-k scored chunks, default 5                                                                         | One embedder load  |
| L2    | `memory_expand`     | The full section behind a chunk hash, plus its session anchor                                          | No embedder, cheap |
| L3    | `memory_transcript` | The turns around the anchored entry, following the branch the memory anchors to even past a later fork | Pure file read     |

Scores are normalized RRF ranks over hybrid dense and BM25 retrieval, **not** cosine similarity. Do not read them as absolute confidence. An empty result says it is empty; it never invents hits.

## Every tool

| Tool                | Layer | Purpose                                                                                                                 |
| ------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------- |
| `memory_write`      |       | Persist a memory now: timestamped, anchored, appended to today's daily memory file                                      |
| `memory_search`     | L1    | Top-k scored chunks for a query; `scope: "all"` widens to cross-repo recall                                             |
| `memory_expand`     | L2    | Full section for a chunk hash, with its session anchor; `project` routes to a cross-repo hit's origin                   |
| `memory_transcript` | L3    | Turns around an anchored entry in the origin transcript, on the branch the memory anchors to; pure file read            |
| `memory_forget`     |       | Redact one entry or compact block from store and collection; the tool result is the only record                         |
| `memory_compact`    |       | Memory compaction on explicit request; returns memsearch's markdown summary                                             |
| `memory_status`     |       | Doctor: uv/memsearch presence and version, scope, collection, index state, chunk count, auto-context state and counters |

`memory_status` is the one to reach for first when recall is not behaving: see [troubleshooting](/troubleshooting/).

## Cross-repo recall

Opt-in and read-side only: `/recall --all <query>`, or `memory_search` with `scope: "all"`. It fans out over every project found under [`PI_MEMSEARCH_SCAN_ROOTS`](/configuration/), one search per project, including projects only other mesh agents ever indexed. Hits merge by score, each labeled with its origin project, and passing that label back as `project` makes `memory_expand` and `memory_transcript` follow across repos.

No store or collection is ever written by a fan-out, and there is deliberately no global store ([ADR 0003](https://github.com/espadat-studio/pi-memsearch/blob/master/meta/adr/0003-no-global-store-cross-repo-recall.md)). The full resolution rules: [the runtime page](/runtime/#cross-repo-recall).
