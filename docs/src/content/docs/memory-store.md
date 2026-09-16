---
title: Memory store
description: The daily markdown files, whether to commit them, and how pi resolves which store a session writes to.
---

Markdown is the source of truth. The searchable collection is derived from it and rebuildable at any time, so the markdown is what to back up, commit or read by hand, and the collection in `~/.memsearch/milvus.db` is a cache you may delete without losing a memory.

## Layout

One file per calendar day, appended to by every agent in the mesh:

```text
<project>/.memsearch/memory/YYYY-MM-DD.md
```

Inside a file, `## Session HH:MM` once per session and `### HH:MM` once per exchange, then a session anchor and third-person bullets:

```text
### 22:41
<!-- session:3f2c9b1e-… turn:ab12cd34 transcript:/home/you/.pi/agent/sessions/…/2026-08-13_….jsonl -->
- the user and the agent moved the hot cache to Redis with 5 minute TTLs
```

The session anchor carries the origin session id, the entry id and the transcript path. It is what makes L3 recall possible: any memory entry traces back to the conversation that produced it.

## Commit it, or ignore it

Commit `.memsearch/` to share memory with collaborators, or gitignore it to keep it personal. The collection lives outside the repo either way, so the choice costs nothing: neither option changes what is searchable on your own machine.

## Which store a session uses

Project scope keys both the memory store and the collection. Resolution order, highest first:

1. `$PI_MEMSEARCH_STORE_CMD`, when set. The opt-in seam, below.
2. `$MEMSEARCH_DIR`, when set.
3. The git root of the session's directory.
4. The working directory.

Rungs 2 to 4 are memsearch's own order, mirrored exactly rather than reinvented, so pi names the same store the CLI and every other mesh agent name ([ADR 0001, mesh parity](https://github.com/espadat-studio/pi-memsearch/blob/master/meta/adr/0001-mesh-parity.md)).

A relative `$MEMSEARCH_DIR` resolves where memsearch's own children run (the git root, else the directory pi started in), so a session in a subdirectory shares one store with the CLI rather than writing beside it. A store left at a subdirectory path by an older pi-memsearch is not migrated.

## Collection naming

`ms_<sanitized-basename>_<8 hex of sha256(abs path)>`, memsearch's derivation, over the resolved project scope. It hashes the absolute path, so moving a repo yields a new collection and the next session start catch-up indexes into it.

An explicit `$MEMSEARCH_DIR` therefore renames the collection as well as moving the store. That is upstream's rule, not a pi quirk: an explicit override means global scope, so the shared directory and the shared collection move together. The full derivation, with the upstream commit it mirrors: [the runtime page](/runtime/#memory-entries).

## A store outside the repos

`$PI_MEMSEARCH_STORE_CMD` hands the store path, the collection name and the index-state directory to a command you own: one central store keyed per repository, say, shared with the other agents on the machine. It outranks `MEMSEARCH_DIR`, and when it is set and fails, resolution raises instead of falling back, because a silent fallback would write memory to the wrong place.

[How to write one](/store-command/), with a reference resolver and the four rules that are easy to get wrong. [Why the seam exists](https://github.com/espadat-studio/pi-memsearch/blob/master/meta/adr/0007-delegated-store-resolution.md), and what was rejected.
