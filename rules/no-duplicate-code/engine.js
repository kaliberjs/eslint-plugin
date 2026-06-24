/**
 * engine.js — Zero-dependency code duplication scanner
 *
 * Exports:
 *   - normalizeSource(source: string): NormLine[]
 *   - scanForDuplication(files: FileEntry[], minLines?: number, options?: { type2?: boolean }): DuplicationGroup[]
 *
 * V8-optimised: single-pass charCodeAt state machine, no regex on hot path.
 * Type 2 detection: regex-based identifier → $ID normalisation (second pass).
 *
 * @typedef {{ filePath: string, content: string }} FileEntry
 * @typedef {{ norm: string, originalLine: number }} NormLine
 * @typedef {{ startLine: number, endLine: number, filePath: string }} Location
 * @typedef {{ signature: string, locations: Location[], detectionType: 'exact' | 'renamed' }} DuplicationGroup
 */

// ─── Character Codes ────────────────────────────────────────────────────────

const CH_NEWLINE = 10
const CH_CR = 13
const CH_TAB = 9
const CH_SPACE = 32
const CH_VTAB = 11
const CH_FORMFEED = 12
const CH_SLASH = 47
const CH_STAR = 42
const CH_DQUOTE = 34
const CH_COMMA = 44
const CH_RBRACE = 125
const CH_RBRACKET = 93
const CH_RPAREN = 41

const S_NORMAL = 0
const S_LINE_COMMENT = 1
const S_BLOCK_COMMENT = 2

function isWhitespace(cc) {
  return cc === CH_SPACE || cc === CH_TAB || cc === CH_NEWLINE ||
         cc === CH_CR || cc === CH_VTAB || cc === CH_FORMFEED
}

function isClosingBracket(cc) {
  return cc === CH_RBRACE || cc === CH_RBRACKET || cc === CH_RPAREN
}

// ─── Type 2: Identifier Normalisation ───────────────────────────────────────

/** JS/TS keywords — never replaced during Type 2 normalisation */
const KEYWORDS = new Set([
  'abstract', 'arguments', 'async', 'await', 'boolean', 'break', 'byte', 'case',
  'catch', 'char', 'class', 'const', 'continue', 'debugger', 'default', 'delete',
  'do', 'double', 'else', 'enum', 'export', 'extends', 'false', 'final',
  'finally', 'float', 'for', 'from', 'function', 'get', 'goto', 'if',
  'implements', 'import', 'in', 'instanceof', 'int', 'interface', 'let', 'long',
  'native', 'new', 'null', 'of', 'package', 'private', 'protected', 'public',
  'return', 'set', 'short', 'static', 'super', 'switch', 'synchronized',
  'this', 'throw', 'throws', 'transient', 'true', 'try', 'typeof', 'undefined',
  'var', 'void', 'volatile', 'while', 'with', 'yield',
  'any', 'as', 'declare', 'is', 'keyof', 'module', 'namespace', 'never',
  'readonly', 'require', 'number', 'object', 'string', 'symbol', 'type', 'unknown',
])

const IDENT_RE = /\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g

/**
 * Replace all non-keyword identifiers with $ID.
 * Operates on already-normalised lines (comments/strings stripped), so
 * no regex/division ambiguity.
 */
function normaliseIdentifiers(line) {
  return line.replace(IDENT_RE, token => KEYWORDS.has(token) ? token : '$ID')
}

// ─── Normalisation ──────────────────────────────────────────────────────────

/**
 * Strip comments, whitespace, normalise quotes and trailing commas in one pass.
 *
 * @param {string} source
 * @returns {NormLine[]}
 */
function normalizeSource(source) {
  /** @type {NormLine[]} */
  const result = []

  let state = S_NORMAL
  let lineBuffer = ''
  let pendingComma = false
  let currentLine = 1
  let lineStartLine = 1

  const len = source.length

  for (let i = 0; i < len; i++) {
    const cc = source.charCodeAt(i)

    switch (state) {
      case S_NORMAL: {
        if (cc === CH_SLASH && i + 1 < len) {
          const next = source.charCodeAt(i + 1)
          if (next === CH_SLASH) {
            pendingComma = false
            state = S_LINE_COMMENT
            i++
            continue
          }
          if (next === CH_STAR) {
            pendingComma = false
            state = S_BLOCK_COMMENT
            i++
            continue
          }
        }

        if (cc === CH_NEWLINE) {
          pendingComma = false
          if (lineBuffer.length > 0) {
            result.push({ norm: lineBuffer, originalLine: lineStartLine })
            lineBuffer = ''
          }
          currentLine++
          continue
        }

        if (isWhitespace(cc)) continue

        if (lineBuffer.length === 0) lineStartLine = currentLine

        if (pendingComma) {
          if (isClosingBracket(cc)) {
            pendingComma = false
          } else {
            lineBuffer += ','
            pendingComma = false
          }
        }

        if (cc === CH_COMMA) {
          pendingComma = true
          continue
        }

        if (cc === CH_DQUOTE) {
          lineBuffer += "'"
          continue
        }

        lineBuffer += String.fromCharCode(cc)
        break
      }

      case S_LINE_COMMENT: {
        if (cc === CH_NEWLINE) {
          state = S_NORMAL
          if (lineBuffer.length > 0) {
            result.push({ norm: lineBuffer, originalLine: lineStartLine })
            lineBuffer = ''
          }
          currentLine++
        }
        break
      }

      case S_BLOCK_COMMENT: {
        if (cc === CH_STAR && i + 1 < len && source.charCodeAt(i + 1) === CH_SLASH) {
          state = S_NORMAL
          i++
          continue
        }
        if (cc === CH_NEWLINE) currentLine++
        break
      }
    }
  }

  pendingComma = false
  if (lineBuffer.length > 0) {
    result.push({ norm: lineBuffer, originalLine: lineStartLine })
  }

  return result
}

// ─── Sliding-Window Scanner ─────────────────────────────────────────────────

/**
 * Scan files for structural code duplication.
 *
 * @param {FileEntry[]} files
 * @param {number} [minLines=6]
 * @param {{ type2?: boolean }} [options]
 * @returns {DuplicationGroup[]}
 */
function scanForDuplication(files, minLines = 6, { type2 = false } = {}) {
  const signatureMap = new Map()
  const fileNormData = new Map()

  for (const { filePath, content } of files) {
    const normLines = normalizeSource(content)
    if (normLines.length < minLines) continue

    fileNormData.set(filePath, normLines)

    const normCount = normLines.length
    const norms = new Array(normCount)
    for (let k = 0; k < normCount; k++) norms[k] = normLines[k].norm

    for (let i = 0; i <= normCount - minLines; i++) {
      const signature = norms.slice(i, i + minLines).join('\n')

      const location = {
        filePath,
        startLine: normLines[i].originalLine,
        endLine: normLines[i + minLines - 1].originalLine,
      }

      if (!signatureMap.has(signature)) {
        signatureMap.set(signature, [location])
      } else {
        signatureMap.get(signature).push(location)
      }
    }
  }

  const rawGroups = []

  for (const [signature, locations] of signatureMap) {
    if (locations.length < 2) continue
    const deduplicated = deduplicateOverlaps(locations, minLines)
    if (deduplicated.length >= 2) {
      rawGroups.push({ signature, locations: deduplicated, detectionType: 'exact' })
    }
  }

  const type1Merged = mergeOverlappingGroups(rawGroups, fileNormData)

  if (!type2) return type1Merged

  // ─── Type 2 Pass: identifier-normalised sliding window ──────────────

  const type2SignatureMap = new Map()

  for (const { filePath, content } of files) {
    const normLines = fileNormData.get(filePath)
    if (!normLines || normLines.length < minLines) continue

    const normCount = normLines.length
    const norms = new Array(normCount)
    for (let k = 0; k < normCount; k++) norms[k] = normaliseIdentifiers(normLines[k].norm)

    for (let i = 0; i <= normCount - minLines; i++) {
      const signature = norms.slice(i, i + minLines).join('\n')

      const location = {
        filePath,
        startLine: normLines[i].originalLine,
        endLine: normLines[i + minLines - 1].originalLine,
      }

      if (!type2SignatureMap.has(signature)) {
        type2SignatureMap.set(signature, [location])
      } else {
        type2SignatureMap.get(signature).push(location)
      }
    }
  }

  // Build Type 1 covered ranges for deduplication (merged, so ranges are maximal)
  const type1CoveredByFile = new Map()
  for (const group of type1Merged) {
    for (const loc of group.locations) {
      if (!type1CoveredByFile.has(loc.filePath)) type1CoveredByFile.set(loc.filePath, [])
      type1CoveredByFile.get(loc.filePath).push(loc)
    }
  }

  function isCoveredByType1(loc) {
    const ranges = type1CoveredByFile.get(loc.filePath)
    if (!ranges) return false
    return ranges.some(r => r.startLine <= loc.startLine && r.endLine >= loc.endLine)
  }

  const type2RawGroups = []

  for (const [signature, locations] of type2SignatureMap) {
    if (locations.length < 2) continue
    const deduplicated = deduplicateOverlaps(locations, minLines)
    if (deduplicated.length < 2) continue

    // Skip if all locations are already covered by a Type 1 group
    const hasNewLocation = deduplicated.some(loc => !isCoveredByType1(loc))
    if (!hasNewLocation) continue

    type2RawGroups.push({ signature, locations: deduplicated, detectionType: 'renamed' })
  }

  const type2Merged = mergeOverlappingGroups(type2RawGroups, fileNormData)

  // Final dedup: remove any merged Type 2 groups fully covered by merged Type 1
  const type2Filtered = type2Merged.filter(group =>
    group.locations.some(loc => !isCoveredByType1(loc))
  )

  return [...type1Merged, ...type2Filtered]
}

// ─── Overlap Prevention ─────────────────────────────────────────────────────

function deduplicateOverlaps(locations, minLines) {
  const byFile = new Map()
  for (const loc of locations) {
    if (!byFile.has(loc.filePath)) byFile.set(loc.filePath, [])
    byFile.get(loc.filePath).push(loc)
  }

  const kept = []

  for (const [, fileLocs] of byFile) {
    fileLocs.sort((a, b) => a.startLine - b.startLine)

    let last = null
    for (const loc of fileLocs) {
      if (last === null || loc.startLine - last.startLine >= minLines) {
        kept.push(loc)
        last = loc
      }
    }
  }

  return kept
}

// ─── Maximal Clone Expansion ────────────────────────────────────────────────

function mergeOverlappingGroups(groups, fileNormData) {
  if (groups.length === 0) return groups

  for (const group of groups) {
    group.locations.sort((a, b) =>
      a.filePath < b.filePath ? -1 : a.filePath > b.filePath ? 1 : a.startLine - b.startLine
    )
  }

  const buckets = new Map()
  for (const group of groups) {
    const key = group.locations.map(l => l.filePath).join('\0')
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(group)
  }

  const merged = []

  for (const [, bucket] of buckets) {
    bucket.sort((a, b) => a.locations[0].startLine - b.locations[0].startLine)

    const detectionType = bucket[0].detectionType
    let mergedLocs = bucket[0].locations.map(l => ({ ...l }))

    for (let i = 1; i < bucket.length; i++) {
      const next = bucket[i]
      let allOverlap = true
      for (let j = 0; j < mergedLocs.length; j++) {
        const ml = mergedLocs[j]
        const nl = next.locations[j]
        if (ml.filePath !== nl.filePath || nl.startLine > ml.endLine + 1) {
          allOverlap = false
          break
        }
      }

      if (allOverlap) {
        for (let j = 0; j < mergedLocs.length; j++) {
          mergedLocs[j].endLine = Math.max(mergedLocs[j].endLine, next.locations[j].endLine)
        }
      } else {
        merged.push({
          signature: buildSignature(mergedLocs[0], fileNormData),
          locations: mergedLocs,
          detectionType,
        })
        mergedLocs = next.locations.map(l => ({ ...l }))
      }
    }

    merged.push({
      signature: buildSignature(mergedLocs[0], fileNormData),
      locations: mergedLocs,
      detectionType,
    })
  }

  return merged
}

function buildSignature(loc, fileNormData) {
  const normLines = fileNormData.get(loc.filePath)
  if (!normLines) return ''

  const parts = []
  for (const nl of normLines) {
    if (nl.originalLine >= loc.startLine && nl.originalLine <= loc.endLine) {
      parts.push(nl.norm)
    }
  }
  return parts.join('\n')
}

module.exports = { normalizeSource, scanForDuplication }
