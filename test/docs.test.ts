import { ok } from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const REPO = fileURLToPath(new URL('../', import.meta.url))
const SITE_PAGES = 'docs/src/content/docs'
// The README must resolve on GitHub, on npm and on pi.dev, so it links repo files
// absolutely rather than trusting three renderers to rewrite relative paths.
const OWN_REPO = /^https:\/\/github\.com\/espadat-studio\/pi-memsearch\/(blob|tree)\/master\//
const SITE_ORIGIN = 'https://pi-memsearch.espadat.com'
const INLINE_LINK = /\]\(([^)\s]+)\)/g
const MARKER = '<!-- x-release-please-version -->'

test('every relative markdown link resolves, anchor included', () => {
  const broken: string[] = []
  for (const file of repoMarkdown()) {
    const body = readFileSync(join(REPO, file), 'utf8')
    for (const match of body.matchAll(INLINE_LINK)) {
      const target = match[1] ?? ''
      const path = localPath(file, target)
      if (!path) continue
      if (!existsSync(path)) {
        broken.push(`${file} → ${target} (no such file)`)
        continue
      }
      // GitHub serves directories under /tree/ and files under /blob/.
      const ownRepoKind = OWN_REPO.exec(target)?.[1]
      if (ownRepoKind && (ownRepoKind === 'tree') !== statSync(path).isDirectory())
        broken.push(`${file} → ${target} (blob and tree are not interchangeable)`)

      const [, anchor] = target.split('#')
      // An own-repo URL may anchor at a line number rather than a heading.
      if (anchor && !ownRepoKind && !headingSlugs(path).has(anchor))
        broken.push(`${file} → ${target} (no such heading)`)
    }
  }
  ok(broken.length === 0, `unresolved links:\n${broken.join('\n')}`)
})

test('every sidebar entry names a page that exists', () => {
  const config = readFileSync(join(REPO, 'docs/astro.config.mjs'), 'utf8')
  const missing = [...config.matchAll(/slug: '([^']+)'/g)]
    .map(([, slug]) => `${SITE_PAGES}/${slug}.md`)
    .filter((page) => !existsSync(join(REPO, page)))
  ok(missing.length === 0, `sidebar entries without a page:\n${missing.join('\n')}`)
})

test('every page stating the release is wired to release-please', () => {
  // Two halves of one mechanism; CONTRIBUTING.md's release section says why.
  const config = JSON.parse(readFileSync(join(REPO, 'release-please-config.json'), 'utf8'))
  const wired: string[] = config.packages['.']['extra-files'].map((entry: string | { path: string }) =>
    typeof entry === 'string' ? entry : entry.path
  )
  const marked = repoMarkdown().filter((file) => readFileSync(join(REPO, file), 'utf8').includes(MARKER))

  ok(marked.length > 0, 'nothing states the current release any more')
  for (const file of marked) ok(wired.includes(file), `${file} states a version release-please never updates`)
  for (const file of wired)
    if (file.endsWith('.md')) ok(marked.includes(file), `${file} is wired to release-please but carries no ${MARKER}`)
})

function repoMarkdown(): string[] {
  const listed = execFileSync('git', ['ls-files', '*.md'], { cwd: REPO, encoding: 'utf8' })
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

function localPath(file: string, target: string): string | null {
  const [path] = target.split('#')
  if (path && OWN_REPO.test(path)) return join(REPO, path.replace(OWN_REPO, ''))
  // A published page, addressed by full URL from the README or by Starlight slug
  // from inside the site. Both spellings name the same file.
  if (path?.startsWith(SITE_ORIGIN)) return sitePage(path.slice(SITE_ORIGIN.length))
  if (/^[a-z]+:/.test(target)) return null
  if (target.startsWith('#')) return join(REPO, file)
  if (!path) return null
  if (path.startsWith('/')) return file.startsWith(SITE_PAGES) ? sitePage(path) : null
  return resolve(dirname(join(REPO, file)), path)
}

function sitePage(slug: string): string {
  const trimmed = slug.replace(/^\/|\/$/g, '')
  return join(REPO, SITE_PAGES, `${trimmed || 'index'}.md`)
}
