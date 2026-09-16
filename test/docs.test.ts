import { ok } from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'

const repo = new URL('../', import.meta.url).pathname
const SITE_PAGES = 'docs/src/content/docs'
const INLINE_LINK = /\]\(([^)\s]+)\)/g

test('every relative link in tracked markdown resolves', () => {
  const broken: string[] = []
  for (const file of trackedMarkdown()) {
    const body = readFileSync(join(repo, file), 'utf8')
    for (const match of body.matchAll(INLINE_LINK)) {
      const path = localPath(file, match[1] ?? '')
      if (path && !existsSync(path)) broken.push(`${file} → ${match[1]}`)
    }
  }
  ok(broken.length === 0, `unresolved links:\n${broken.join('\n')}`)
})

test('every sidebar entry names a page that exists', () => {
  const config = readFileSync(join(repo, 'docs/astro.config.mjs'), 'utf8')
  const missing = [...config.matchAll(/slug: '([^']+)'/g)]
    .map(([, slug]) => `${SITE_PAGES}/${slug}.md`)
    .filter((page) => !existsSync(join(repo, page)))
  ok(missing.length === 0, `sidebar entries without a page:\n${missing.join('\n')}`)
})

test('the README carries the release-please version marker', () => {
  // Wired through `extra-files` in release-please-config.json: rewriting the README
  // without the marker silently freezes the stated version.
  const readme = readFileSync(join(repo, 'README.md'), 'utf8')
  ok(readme.includes('<!-- x-release-please-version -->'), 'README lost x-release-please-version')
})

function trackedMarkdown(): string[] {
  const listed = execFileSync('git', ['ls-files', '*.md'], { cwd: repo, encoding: 'utf8' })
  // CHANGELOG.md is release-please's; its links are absolute commit URLs.
  return listed.split('\n').filter((file) => file && file !== 'CHANGELOG.md')
}

// The local file a link target names, or null when nothing local is addressed.
function localPath(file: string, target: string): string | null {
  const [path] = target.split('#')
  if (!path || /^[a-z]+:/.test(target) || target.startsWith('#')) return null
  // Site pages link each other by Starlight slug, rooted at the docs collection.
  if (path.startsWith('/')) {
    if (!file.startsWith(SITE_PAGES)) return null
    return join(repo, SITE_PAGES, `${path.replace(/^\/|\/$/g, '')}.md`)
  }
  return resolve(dirname(join(repo, file)), path)
}
