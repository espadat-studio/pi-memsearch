---
title: Install
description: Prerequisites, the four install forms, what the first run does, and what survives an uninstall.
---

Current release: [1.4.2](https://github.com/espadat-studio/pi-memsearch/blob/master/CHANGELOG.md). <!-- x-release-please-version -->

## Prerequisites

- [uv](https://docs.astral.sh/uv/) — the only external dependency. memsearch runs through `uvx`, so there is no Python packaging to manage.
- pi >= 0.84.1. The 0.84.x line is the one the integration suite runs against.
- Node >= 22.19.
- Linux or macOS. milvus-lite ships no Windows wheels, so Windows needs WSL2.

## Installing

Four forms. They differ only in which settings file the entry lands in, and whether `pi update` may advance it.

```sh
pi install npm:pi-memsearch                               # all projects (~/.pi/settings.json)
pi install npm:pi-memsearch -l                            # this project (.pi/settings.json)
pi install npm:pi-memsearch@1.0.0                         # pinned; `pi update` never advances it
pi install https://github.com/espadat-studio/pi-memsearch # unreleased master
```

## The first run

:::note[The first run pauses once, on purpose]
`uvx` resolves `memsearch[onnx]>=0.4.17,<0.5`, and then the first embedding downloads the onnx model — about 560 MB, roughly a 10 s pause on a fast connection. pi announces it as a notice so it is not mistaken for a hang. It happens once per machine, not once per project.
:::

No API key is involved. When no embedding provider is configured anywhere, pi-memsearch writes `embedding.provider = onnx` into memsearch's global config, once. An existing config is never touched: whatever the rest of the mesh already agreed on stays.

After that, leave it alone. Capture runs on every settled exchange, and the store indexes itself.

## Confirming it worked

`memory_status` is the doctor. Ask for it in a session and it reports uv and memsearch presence and version, the resolved scope and collection, the index state and chunk count, and the auto-context state with its counters.

If anything looks wrong, [troubleshooting](/troubleshooting/) is built around reading that output.

## Uninstall

```sh
pi remove npm:pi-memsearch
```

The memory markdown under `.memsearch/` survives. It is yours, not the package's — the collection in `~/.memsearch/milvus.db` is derived from that markdown and rebuildable at any time, so nothing irreplaceable ever lived inside pi-memsearch.
