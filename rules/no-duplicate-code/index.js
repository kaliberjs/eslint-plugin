/**
 * no-duplicate-code
 *
 * Detects structural code duplication across project files and surfaces
 * findings as native ESLint diagnostics with actionable suggestions.
 *
 * Message strategy (two-tier):
 *   - message:  Compact one-liner for VS Code Problems panel
 *   - suggest:  Rich context for LLMs (code preview + import instruction)
 *
 * Canonical source selection prevents circular references:
 *   1. Prefer shared/machinery/lib/utils/helpers/common paths
 *   2. Prefer shallower path depth
 *   3. Alphabetical tiebreaker
 *
 * Only non-canonical files get warnings. The canonical file is the
 * code to reuse — it stays clean.
 */

const { readFileSync, readdirSync, statSync } = require('node:fs')
const { join, extname, sep } = require('node:path')
const docsUrl = require('../../machinery/docsUrl')
const { scanForDuplication } = require('./engine')

// ─── Configuration ──────────────────────────────────────────────────────────

const MIN_LINES = 6
const CACHE_TTL = 10_000
const PREVIEW_LINES = 3

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

const SHARED_PATH_SEGMENTS = /\/(shared|machinery|lib|utils|helpers|common)\//

const SCAN_DIRS = ['src', 'config', 'services']

// ─── File Discovery ─────────────────────────────────────────────────────────

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
      } else if (entry.isFile()) {
        if (!JS_EXTENSIONS.has(extname(entry.name))) continue
        if (IGNORE_PATTERNS.some(re => re.test(entry.name))) continue
        const filePath = join(currentDir, entry.name)
        try {
          if (statSync(filePath).size <= MAX_FILE_SIZE) files.push(filePath)
        } catch { /* skip */ }
      }
    }
  }
  walk(dir)
  return files
}

// ─── Canonical Source Selection ─────────────────────────────────────────────

function selectCanonical(locations) {
  return locations.slice().sort((a, b) => {
    const aShared = SHARED_PATH_SEGMENTS.test(a.filePath) ? 0 : 1
    const bShared = SHARED_PATH_SEGMENTS.test(b.filePath) ? 0 : 1
    if (aShared !== bShared) return aShared - bShared

    const aDepth = a.filePath.split(sep).length
    const bDepth = b.filePath.split(sep).length
    if (aDepth !== bDepth) return aDepth - bDepth

    return a.filePath < b.filePath ? -1 : a.filePath > b.filePath ? 1 : 0
  })[0]
}

// ─── Scan Cache ─────────────────────────────────────────────────────────────

let cachedFindings = null
let lastScanTime = 0
let projectRoot = null

function ensureFindings(currentFile) {
  const now = Date.now()

  if (!projectRoot) {
    let dir = require('node:path').dirname(currentFile)
    while (dir !== require('node:path').dirname(dir)) {
      try { statSync(join(dir, 'eslint.config.js')); projectRoot = dir; break }
      catch { /* keep going */ }
      try { statSync(join(dir, 'package.json')); projectRoot = dir; break }
      catch { /* keep going */ }
      dir = require('node:path').dirname(dir)
    }
    if (!projectRoot) projectRoot = process.cwd()
  }

  if (cachedFindings && (now - lastScanTime) < CACHE_TTL) return cachedFindings

  const allFiles = []
  for (const dirName of SCAN_DIRS) {
    try { allFiles.push(...collectFiles(join(projectRoot, dirName))) }
    catch { /* skip missing dirs */ }
  }

  if (allFiles.length === 0) {
    cachedFindings = new Map()
    lastScanTime = now
    return cachedFindings
  }

  const fileEntries = allFiles.map(fp => ({
    filePath: fp,
    content: readFileSync(fp, 'utf-8'),
  }))

  const groups = scanForDuplication(fileEntries, MIN_LINES)
  const absPrefix = projectRoot + sep

  cachedFindings = buildFindings(groups, absPrefix)
  lastScanTime = now

  return cachedFindings
}

// ─── Finding Builder ────────────────────────────────────────────────────────

/**
 * Build findings: one entry per non-canonical location per group.
 * Each finding has a compact message + a rich suggestion for LLMs.
 */
function buildFindings(groups, absPrefix) {
  /** @type {Map<string, object[]>} */
  const findingsByFile = new Map()

  for (const group of groups) {
    const sigLines = group.signature ? group.signature.split('\n') : []
    const lineCount = sigLines.length

    // Code preview for the suggestion (first N lines, readable)
    const previewRaw = sigLines.slice(0, PREVIEW_LINES).join(', ')
    const preview = previewRaw.length > 120
      ? previewRaw.slice(0, 117) + '...'
      : previewRaw

    const canonical = selectCanonical(group.locations)
    const canonicalRel = canonical.filePath.replace(absPrefix, '')
    const canonicalRef = `${canonicalRel}:${canonical.startLine}-${canonical.endLine}`

    for (const location of group.locations) {
      if (location === canonical) continue

      const finding = {
        line: location.startLine,
        endLine: location.endLine,
        // Compact message for Problems panel
        message: `Duplicated code (${lineCount} lines) — consider reusing ${canonicalRef}`,
        // Rich suggestion for LLMs (code preview + actionable instruction)
        suggestDesc:
          `Replace with import from ${canonicalRef}. ` +
          `The existing code starts with: ${preview}` +
          (lineCount > PREVIEW_LINES ? ` (${lineCount - PREVIEW_LINES} more lines)` : '') +
          `. Delete this block and import/reuse from ${canonicalRel} instead.`,
        canonicalRef,
      }

      const key = location.filePath
      if (!findingsByFile.has(key)) findingsByFile.set(key, [])
      findingsByFile.get(key).push(finding)
    }
  }

  return findingsByFile
}

// ─── ESLint Rule ────────────────────────────────────────────────────────────

module.exports = {
  meta: {
    type: 'suggestion',
    hasSuggestions: true,
    docs: {
      description: 'Detect code duplication across project files and suggest reuse of the canonical source',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages: {
      duplicateCode: '{{ message }}',
    },
  },

  create(context) {
    return {
      Program() {
        const filename = context.filename || context.getFilename()
        const findings = ensureFindings(filename)

        const fileFindings = findings.get(filename)
        if (!fileFindings || fileFindings.length === 0) return

        const sourceCode = context.sourceCode || context.getSourceCode()

        for (const finding of fileFindings) {
          context.report({
            loc: {
              start: { line: finding.line, column: 0 },
              end: { line: finding.endLine, column: 0 },
            },
            messageId: 'duplicateCode',
            data: { message: finding.message },
            suggest: [
              {
                desc: finding.suggestDesc,
                fix(fixer) {
                  // Insert a TODO comment as a breadcrumb
                  const lineStart = sourceCode.getIndexFromLoc({ line: finding.line, column: 0 })
                  return fixer.insertTextBeforeRange(
                    [lineStart, lineStart],
                    `// TODO: Reuse from ${finding.canonicalRef}\n`
                  )
                },
              },
            ],
          })
        }
      },
    }
  },
}
