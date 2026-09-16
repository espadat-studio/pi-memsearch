import { ok } from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'

const repo = new URL('../', import.meta.url).pathname
const SITE_PAGES = 'docs/src/content/docs'
// The README must resolve on GitHub, on npm and on pi.dev, so it links repo files
// absolutely rather than trusting three renderers to rewrite relative paths.
const OWN_REPO = /^https:\/\/github\.com\/espadat-studio\/pi-memsearch\/(blob|tree)\/master\//
const INLINE_LINK = /\]\(([^)\s]+)\)/g
const MARKER = '<!-- x-release-please-version -->'

test('every relative markdown link resolves, anchor included', () => {
  const broken: string[] = []
  for (const file of repoMarkdown()) {
    const body = readFileSync(join(repo, file), 'utf8')
    for (const match of body.matchAll(INLINE_LINK)) {
      const target = match[1] ?? ''
      const path = localPath(file, target)
      if (!path) continue
      if (!existsSync(path)) {
        broken.push(`${file} → ${target} (no such file)`)
        continue
      }
      // GitHub serves directories under /tree/ and files under /blob/.
      const own = OWN_REPO.exec(target)
      if (own && (own[1] === 'tree') !== statSync(path).isDirectory())
        broken.push(`${file} → ${target} (blob and tree are not interchangeable)`)

      const [, anchor] = target.split('#')
      // An own-repo URL may anchor at a line number rather than a heading.
      if (anchor && !own && !headingSlugs(path).has(anchor))
        broken.push(`${file} → ${target} (no such heading)`)
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

test('every page stating the release is wired to release-please', () => {
  // The marker and the `extra-files` entry are two halves of one mechanism. A page
  // carrying the marker without the entry freezes its version silently, and an entry
  // without the marker updates nothing at all.
  const config = JSON.parse(readFileSync(join(repo, 'release-please-config.json'), 'utf8'))
  const wired: string[] = config.packages['.']['extra-files'].map((entry: string | { path: string }) =>
    typeof entry === 'string' ? entry : entry.path
  )
  const marked = repoMarkdown().filter((file) => readFileSync(join(repo, file), 'utf8').includes(MARKER))

  ok(marked.length > 0, 'nothing states the current release any more')
  for (const file of marked) ok(wired.includes(file), `${file} states a version release-please never updates`)
  for (const file of wired)
    if (file.endsWith('.md')) ok(marked.includes(file), `${file} is wired to release-please but carries no ${MARKER}`)
})

function repoMarkdown(): string[] {
  // `--others` so a page added but not yet staged is checked too: a new page is
  // exactly when a link goes stale.
  const args = ['ls-files', '--cached', '--others', '--exclude-standard', '*.md']
  const listed = execFileSync('git', args, { cwd: repo, encoding: 'utf8' })
  // CHANGELOG.md is release-please's; its links are absolute commit URLs.
  return listed.split('\n').filter((file) => file && file !== 'CHANGELOG.md')
}

// Heading ids as github-slugger builds them, which is what Starlight and GitHub
// both anchor to: formatting dropped, punctuation dropped, spaces hyphenated.
function headingSlugs(path: string): Set<string> {
  const headings = readFileSync(path, 'utf8').matchAll(/^#{1,6} +(.+)$/gm)
  return new Set(
    [...headings].map(([, heading]) =>
      (heading ?? '')
        .replace(/[`*]/g, '')
        .toLowerCase()
        .replace(/[^\w\- ]/g, '')
        .trim()
        .replace(/ +/g, '-')
    ),
  )
}

// The local file a link target names, or null when nothing local is addressed.
function localPath(file: string, target: string): string | null {
  const [path] = target.split('#')
  if (path && OWN_REPO.test(path)) return join(repo, path.replace(OWN_REPO, ''))
  if (/^[a-z]+:/.test(target)) return null
  if (target.startsWith('#')) return join(repo, file)
  if (!path) return null
  // Site pages link each other by Starlight slug, rooted at the docs collection.
  if (path.startsWith('/')) {
    if (!file.startsWith(SITE_PAGES)) return null
    return join(repo, SITE_PAGES, `${path.replace(/^\/|\/$/g, '')}.md`)
  }
  return resolve(dirname(join(repo, file)), path)
}
