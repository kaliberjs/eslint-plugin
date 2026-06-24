const { readFileSync, statSync } = require('node:fs')
const { join, dirname, sep } = require('node:path')
const { scanForDuplication } = require('./engine')
const { collectFiles } = require('./collectFiles')
const { buildFindings } = require('./buildFindings')

const CACHE_TTL = 10_000 // re-scan after 10s so watch mode picks up changes

let cachedFindings = null
let lastScanTime = 0
let lastOptionsKey = null
let projectRoot = null

/**
 * Ensure we have fresh duplication findings for the current project.
 *
 * On first call, derives the project root from the file being linted,
 * scans all source files, and caches the results. Subsequent calls
 * within the TTL (with the same options) return the cached findings.
 *
 * @param {string} currentFile — absolute path of the file ESLint is linting
 * @param {{ minLines: number, scanDirs: string[] }} options
 * @returns {Map<string, Array<{line: number, endLine: number, message: string}>>}
 */
function ensureFindings(currentFile, { minLines, scanDirs }) {
  const now = Date.now()
  const optionsKey = `${minLines}:${scanDirs.join(',')}`

  if (!projectRoot) projectRoot = findProjectRoot(currentFile)

  const cacheValid = cachedFindings
    && (now - lastScanTime) < CACHE_TTL
    && lastOptionsKey === optionsKey

  if (cacheValid) return cachedFindings

  const allFiles = discoverFiles(projectRoot, scanDirs)

  if (allFiles.length === 0) {
    cachedFindings = new Map()
    lastScanTime = now
    lastOptionsKey = optionsKey
    return cachedFindings
  }

  const fileEntries = allFiles.map(fp => ({
    filePath: fp,
    content: readFileSync(fp, 'utf-8'),
  }))

  const groups = scanForDuplication(fileEntries, minLines)
  cachedFindings = buildFindings(groups, projectRoot + sep)
  lastScanTime = now
  lastOptionsKey = optionsKey

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

function discoverFiles(root, scanDirs) {
  const allFiles = []
  for (const dirName of scanDirs) {
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
