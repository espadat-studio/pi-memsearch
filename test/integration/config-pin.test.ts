import { equal, ok } from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { MEMSEARCH_SPEC } from '../../src/contract.ts'
import { indexStatePath, readIndexState } from '../../src/index-state.ts'
import { spawnSidecarProcess } from '../../src/sidecar.ts'
import { assistantEntry, userEntry } from '../harness.ts'
import { type LiveHarness, setupLive, SKIP_UNLESS_GATED } from './live.ts'

const SIDECAR_SCRIPT = fileURLToPath(new URL('../../src/sidecar.py', import.meta.url))
const GLOBAL_PIN = 'ms_it_global_pin'
const PROJECT_PIN = 'ms_it_project_pin'

const BULLETS = [
  '- the user and the agent pinned the chronometer ledger to one shared collection across worktrees',
  '- the agent kept the chronometer ledger retention at ninety days',
]
  .join('\n')

function pinGlobally(live: LiveHarness): void {
  mkdirSync(join(live.home, '.memsearch'), { recursive: true })
  writeFileSync(
    join(live.home, '.memsearch', 'config.toml'),
    `[embedding]\nprovider = "onnx"\n\n[milvus]\ncollection = "${GLOBAL_PIN}"\n`,
  )
}

function sidecarSearch(cwd: string, request: Record<string, unknown>): Promise<Record<string, unknown>> {
  const proc = spawnSidecarProcess('uv', ['run', '--no-project', '--with', MEMSEARCH_SPEC, 'python', SIDECAR_SCRIPT], {
    cwd,
  })
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('no reply from the raw sidecar within 240s')), 240_000)
    proc.onExit(() => {
      clearTimeout(timer)
      reject(new Error('the raw sidecar exited before replying'))
    })
    proc.onLine((line) => {
      let record: Record<string, unknown>
      try {
        record = JSON.parse(line) as Record<string, unknown>
      } catch {
        return
      }
      if (record['event'] === 'ready') {
        proc.send(JSON.stringify({ ...request, id: 1, top_k: 3 }))
        return
      }
      if (record['id'] === 1) {
        clearTimeout(timer)
        resolve(record)
      }
    })
  })
    .finally(() => proc.end())
}

describe('memsearch config pins outrank the derived collection', { skip: SKIP_UNLESS_GATED }, () => {
  const live = setupLive({ complete: async () => BULLETS })
  pinGlobally(live)
  writeFileSync(join(live.root, '.memsearch.toml'), `[milvus]\ncollection = "${PROJECT_PIN}"\n`)

  test('capture indexes into the project pin, which outranks the global one', async () => {
    await live.fire('session_start')
    await live.settle()
    live.branch.push(
      userEntry('u1', 'how do we share the chronometer ledger across worktrees?'),
      assistantEntry('a1', 'Pin one collection in config; keep ninety days.'),
    )
    await live.fire('agent_settled')
    await live.settle()
    await live.fire('session_shutdown')

    const statePath = indexStatePath(live.memoryDir, { baseDir: live.root, env: process.env })
    ok(statePath)
    const state = readIndexState(statePath)
    equal(state?.status, 'ok')
    equal(state?.collection, PROJECT_PIN)
  })

  test('search and status read the pinned collection', async () => {
    await live.restartSession()

    const found = await live.toolText('memory_search', { query: 'how is the chronometer ledger shared?' })
    ok(found.includes('chronometer ledger'), `search missed the pinned collection:\n${found}`)

    const status = await live.toolText('memory_status', {})
    ok(
      status.includes(`collection: ${PROJECT_PIN} (set by memsearch config; default ${live.collection})`),
      `status did not report the pin:\n${status}`,
    )
    ok(/indexed chunks: [1-9]\d*/.test(status), `status counted the wrong collection:\n${status}`)
  })

  test('the sidecar layers a default collection under the pin, but not an explicit one', async () => {
    const layered = await sidecarSearch(live.root, {
      default_collection: live.collection,
      query: 'chronometer ledger retention',
    })
    ok(Array.isArray(layered['hits']) && layered['hits'].length > 0, `no hits via the pin: ${JSON.stringify(layered)}`)

    const explicit = await sidecarSearch(live.root, { collection: live.collection, query: 'chronometer ledger' })
    equal((explicit['hits'] as unknown[]).length, 0, 'an explicit name bypasses config')
  })

  test('without a project pin, the global pin outranks the derivation', async () => {
    const other = setupLive()
    pinGlobally(other)
    await other.fire('session_start')

    const status = await other.toolText('memory_status', {})

    ok(
      status.includes(`collection: ${GLOBAL_PIN} (set by memsearch config; default ${other.collection})`),
      `status did not report the global pin:\n${status}`,
    )
  })
})
