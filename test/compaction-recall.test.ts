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

test('text parts of a pasted-screenshot message join the query', async () => {
  const { calls, ctx, fire } = harness([okResult(VERSION_STDOUT), okResult(SEARCH_JSON)])
  const prep = preparation([])
  prep.messagesToSummarize.push({
    role: 'user',
    content: [
      { type: 'text', text: 'fix the flaky redis test' },
      { data: 'aGVsbG8=', mimeType: 'image/png', type: 'image' },
    ],
    timestamp: 0,
  })

  await fire('session_before_compact', { preparation: prep }, ctx)

  equal(prep.messagesToSummarize.length, 2, 'the text part keeps the message in the query window')
  const search = calls.find((call) => call.args.includes('search'))
  ok(search)
  match(search.args.join(' '), /fix the flaky redis test/)
})

test('the search carries the compaction abort signal', async () => {
  const { calls, ctx, fire } = harness([okResult(VERSION_STDOUT), okResult(SEARCH_JSON)])
  const prep = preparation(['fix the flaky redis test'])
  const controller = new AbortController()

  await fire('session_before_compact', { preparation: prep, signal: controller.signal }, ctx)

  const search = calls.find((call) => call.args.includes('search'))
  ok(search, 'the search ran while the compaction was live')
  controller.abort()
  equal(search.options.signal?.aborted, true, 'cancelling the compaction aborts the search')
})

test('no user text in the window injects nothing', async () => {
  const { ctx, fire } = harness([okResult(VERSION_STDOUT), okResult(SEARCH_JSON)])
  const prep = preparation([])

  await fire('session_before_compact', { preparation: prep }, ctx)

  equal(prep.messagesToSummarize.length, 0)
})

test('an image-only message does not take a slot in the query window', async () => {
  const { calls, ctx, fire } = harness([okResult(VERSION_STDOUT), okResult(SEARCH_JSON)])
  const prep = preparation(['one', 'two', 'three', 'four', 'five'])
  prep.messagesToSummarize.push({
    role: 'user',
    content: [
      { data: 'aGVsbG8=', mimeType: 'image/png', type: 'image' },
      { data: 'aGVsbG8=', mimeType: 'image/png', type: 'image' },
    ],
    timestamp: 0,
  })

  await fire('session_before_compact', { preparation: prep }, ctx)

  const search = calls.find((call) => call.args.includes('search'))
  ok(search)
  match(search.args.join(' '), /one/)
})
