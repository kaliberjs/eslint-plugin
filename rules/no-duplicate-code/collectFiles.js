const { readdirSync, statSync } = require('node:fs')
const { join, extname } = require('node:path')

const JS_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.cache',
  '.sanity', '.vercel', '.output', '.kaliber-build', '.pnpm-store',
  'storybook-static', 'vendor', 'generated',
])

const IGNORE_PATTERNS = [
  /\.test\./, /\.spec\./, /\.min\./, /\.d\.ts$/,
]

const MAX_FILE_SIZE = 50_000

/**
 * Recursively collect all scannable JS/TS files from a directory,
 * skipping ignored directories, test files, and oversized files.
 *
 * @param {string} dir — absolute path to walk
 * @returns {string[]} — absolute file paths
 */
function collectFiles(dir) {
  const files = []

  function walk(currentDir) {
    let entries
    try { entries = readdirSync(currentDir, { withFileTypes: true }) }
    catch { return }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith('.')) continue
        walk(join(currentDir, entry.name))
        continue
      }

      if (!entry.isFile()) continue
      if (!JS_EXTENSIONS.has(extname(entry.name))) continue
      if (IGNORE_PATTERNS.some(re => re.test(entry.name))) continue

      const filePath = join(currentDir, entry.name)
      try {
        if (statSync(filePath).size <= MAX_FILE_SIZE) files.push(filePath)
      } catch { /* skip unreadable */ }
    }
  }

  walk(dir)
  return files
}

module.exports = { collectFiles }
