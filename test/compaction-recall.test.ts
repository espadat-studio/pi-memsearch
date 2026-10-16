import type { UserMessage } from '@earendil-works/pi-ai'
import { equal, match, ok } from 'node:assert/strict'
import { test } from 'node:test'
import { errResult, MISSING_COLLECTION_STDERRS, okResult, SEARCH_JSON, VERSION_STDOUT } from './fixtures.ts'
import { type FakeExecStep, setupExtension } from './harness.ts'

function userMessage(content: string): UserMessage {
  return { content, role: 'user', timestamp: 0 }
}

function preparation(texts: string[]) {
  return {
    firstKeptEntryId: 'entry-1',
    fileOps: { files: [], snippets: [] },
    isSplitTurn: false,
    messagesToSummarize: texts.map(userMessage),
    settings: { enabled: true, keepRecentTokens: 1000, reserveTokens: 1000 },
    tokensBefore: 100,
    turnPrefixMessages: [],
  }
}

function harness(steps: FakeExecStep[], env?: NodeJS.ProcessEnv) {
  return setupExtension(steps, {
    prefix: 'compaction-recall-',
    ...(env === undefined ? {} : { env }),
  })
}

test('recalled memories join the messages the compaction summarizes', async () => {
  const { ctx, fire } = harness([okResult(VERSION_STDOUT), okResult(SEARCH_JSON)])
  const prep = preparation(['fix the flaky redis test'])

  await fire('session_before_compact', { preparation: prep }, ctx)

  equal(prep.messagesToSummarize.length, 2)
  const injected = prep.messagesToSummarize[1]
  ok(injected)
  equal(injected.role, 'user')
  match(String(injected.content), /\[memsearch memories\]/)
  match(String(injected.content), /memory chunk\(s\)/)
})

test('PI_MEMSEARCH_COMPACT_RECALL=off leaves the messages untouched', async () => {
  const { ctx, fire } = harness([okResult(VERSION_STDOUT), okResult(SEARCH_JSON)], {
    PI_MEMSEARCH_COMPACT_RECALL: 'off',
  })
  const prep = preparation(['fix the flaky redis test'])

  await fire('session_before_compact', { preparation: prep }, ctx)

  equal(prep.messagesToSummarize.length, 1)
})

test('a failing search injects nothing and does not throw', async () => {
  const { ctx, fire } = harness([okResult(VERSION_STDOUT), errResult(1, MISSING_COLLECTION_STDERRS['0.4.21'])])
  const prep = preparation(['fix the flaky redis test'])

  await fire('session_before_compact', { preparation: prep }, ctx)

  equal(prep.messagesToSummarize.length, 1)
})

test('no user text in the window injects nothing', async () => {
  const { ctx, fire } = harness([okResult(VERSION_STDOUT), okResult(SEARCH_JSON)])
  const prep = preparation([])

  await fire('session_before_compact', { preparation: prep }, ctx)

  equal(prep.messagesToSummarize.length, 0)
})
