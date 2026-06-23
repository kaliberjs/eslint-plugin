const { readFileSync, statSync } = require('node:fs')
const { join, dirname, sep } = require('node:path')
const { scanForDuplication } = require('./engine')
const { collectFiles } = require('./collectFiles')
const { buildFindings } = require('./buildFindings')

const MIN_LINES = 6
const CACHE_TTL = 10_000 // re-scan after 10s so watch mode picks up changes
const SCAN_DIRS = ['src', 'config', 'services']

let cachedFindings = null
let lastScanTime = 0
let projectRoot = null

/**
 * Ensure we have fresh duplication findings for the current project.
 *
 * On first call, derives the project root from the file being linted,
 * scans all source files, and caches the results. Subsequent calls
 * within the TTL return the cached findings.
 *
 * @param {string} currentFile — absolute path of the file ESLint is linting
 * @returns {Map<string, Array<{line: number, endLine: number, message: string}>>}
 */
function ensureFindings(currentFile) {
  const now = Date.now()

  if (!projectRoot) projectRoot = findProjectRoot(currentFile)
  if (cachedFindings && (now - lastScanTime) < CACHE_TTL) return cachedFindings

  const allFiles = discoverFiles(projectRoot)

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
  cachedFindings = buildFindings(groups, projectRoot + sep)
  lastScanTime = now

  return cachedFindings
}

function findProjectRoot(startFile) {
  let dir = dirname(startFile)
  while (dir !== dirname(dir)) {
    if (fileExists(join(dir, 'eslint.config.js'))) return dir
    if (fileExists(join(dir, 'package.json'))) return dir
    dir = dirname(dir)
  }
  return process.cwd()
}

function discoverFiles(root) {
  const allFiles = []
  for (const dirName of SCAN_DIRS) {
    try { allFiles.push(...collectFiles(join(root, dirName))) }
    catch { /* skip missing dirs */ }
  }
  return allFiles
}

function fileExists(path) {
  try { statSync(path); return true }
  catch { return false }
}

module.exports = { ensureFindings }
