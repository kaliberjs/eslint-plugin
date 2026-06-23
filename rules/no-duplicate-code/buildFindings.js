const { sep } = require('node:path')

/**
 * Path segments that indicate a file is designed to be shared/imported.
 * Files in these directories get priority as the canonical source.
 */
const SHARED_PATH_SEGMENTS = /\/(shared|machinery|lib|utils|helpers|common)\//

/**
 * Given a list of locations that share duplicated code, pick the one
 * most likely to be the canonical source — the file others should
 * import from rather than duplicate.
 *
 * Heuristic (in priority order):
 *   1. Path contains shared/machinery/lib/utils/helpers/common
 *   2. Shallowest path depth (closer to project root)
 *   3. Alphabetically first (deterministic tiebreaker)
 *
 * @param {Array<{filePath: string}>} locations
 * @returns {{filePath: string}}
 */
function selectCanonical(locations) {
  return locations.slice().sort((a, b) => {
    const aIsShared = SHARED_PATH_SEGMENTS.test(a.filePath) ? 0 : 1
    const bIsShared = SHARED_PATH_SEGMENTS.test(b.filePath) ? 0 : 1
    if (aIsShared !== bIsShared) return aIsShared - bIsShared

    const aDepth = a.filePath.split(sep).length
    const bDepth = b.filePath.split(sep).length
    if (aDepth !== bDepth) return aDepth - bDepth

    return a.filePath < b.filePath ? -1 : a.filePath > b.filePath ? 1 : 0
  })[0]
}

/**
 * Convert raw duplication groups into per-file ESLint findings.
 *
 * For each group, selects a canonical source and only creates findings
 * for the non-canonical locations. Each finding points to the canonical
 * file + line range so the developer knows where to import from.
 *
 * @param {Array<{signature: string, locations: Array<{filePath: string, startLine: number, endLine: number}>}>} groups
 * @param {string} absPrefix — project root + separator, stripped from paths for readability
 * @returns {Map<string, Array<{line: number, endLine: number, message: string}>>}
 */
function buildFindings(groups, absPrefix) {
  /** @type {Map<string, object[]>} */
  const findingsByFile = new Map()

  for (const group of groups) {
    const lineCount = group.signature ? group.signature.split('\n').length : 0
    const canonical = selectCanonical(group.locations)
    const canonicalRef = formatRef(canonical, absPrefix)

    for (const location of group.locations) {
      if (location === canonical) continue

      const finding = {
        line: location.startLine,
        endLine: location.endLine,
        message: `Duplicated code (${lineCount} lines) — consider reusing ${canonicalRef}`,
      }

      const key = location.filePath
      if (!findingsByFile.has(key)) findingsByFile.set(key, [])
      findingsByFile.get(key).push(finding)
    }
  }

  return findingsByFile
}

function formatRef(location, absPrefix) {
  const relativePath = location.filePath.replace(absPrefix, '')
  return `${relativePath}:${location.startLine}-${location.endLine}`
}

module.exports = { selectCanonical, buildFindings }
