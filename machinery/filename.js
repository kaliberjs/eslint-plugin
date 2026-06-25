const path = require('node:path')

module.exports = {
  isApp, isPage, isTemplate, isUniversal,
  getBaseFilename, getLayer, findSrcRoot,
  getLayerFromImportPath, isSublayerOf, matchesLayerPattern,
}

function isApp(context) {
  const filename = context.filename
  return !!filename && filename.endsWith('App.js')
}

function isPage(context) {
  const filename = context.filename
  return /.+\/pages\/[^/]+\.js/.test(filename)
}

function isTemplate(context) {
  const filename = context.filename
  return /.+\.[^.]+\.js/.test(filename)
}

function getBaseFilename(context) {
  const filename = context.filename
  const basename = path.basename(filename, '.js')

  if (isTemplate(context)) {
    const [name] = basename.split('.')
    return name.slice(0, 1).toUpperCase() + name.slice(1)
  } else return basename
}

function isUniversal(context) {
  const filename = context.filename
  return !!filename && filename.endsWith('.universal.js')
}

/** Get the architectural layer for a file path (relative to its src root) */
function getLayer(filePath, sublayerParents = ['features']) {
  const srcRoot = findSrcRoot(filePath)
  if (!srcRoot) return null

  const relative = filePath.slice(srcRoot.length + 1)
  const segments = relative.split(path.sep)

  return layerFromSegments(segments, sublayerParents)
}

/** Get the architectural layer for an import path like '/features/hero/Hero' */
function getLayerFromImportPath(importPath, sublayerParents = ['features']) {
  const segments = importPath.slice(1).split('/')

  return layerFromSegments(segments, sublayerParents)
}

/** Check if a layer is a sublayer of a parent (e.g. 'features/hero' is a sublayer of 'features') */
function isSublayerOf(layer, parent) {
  return layer.startsWith(parent + '/')
}

/**
 * Check if a layer matches an allowed pattern, considering sublayer parents.
 *
 * - Exact match: 'machinery' matches 'machinery'
 * - Parent match: 'features' matches 'features/hero' (when 'features' is a sublayer parent)
 * - Wildcard match: 'features/*' matches 'features/hero'
 */
function matchesLayerPattern(targetLayer, pattern, sublayerParents = []) {
  if (pattern === targetLayer) return true

  for (const parent of sublayerParents) {
    if (pattern === parent && isSublayerOf(targetLayer, parent)) return true
    if (pattern === parent + '/*' && isSublayerOf(targetLayer, parent)) return true
  }

  return false
}

function findSrcRoot(filePath) {
  const segments = filePath.split(path.sep)
  const srcIndex = segments.lastIndexOf('src')
  if (srcIndex === -1) return null
  return segments.slice(0, srcIndex + 1).join(path.sep)
}

// ─── internal ───────────────────────────────────────────────────────────────

function layerFromSegments(segments, sublayerParents) {
  if (!segments.length || !segments[0]) return null

  if (sublayerParents.includes(segments[0]) && segments.length > 1) {
    return segments[0] + '/' + segments[1]
  }

  return segments[0]
}
