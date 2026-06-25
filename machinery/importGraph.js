const { readFileSync, existsSync } = require('node:fs')
const { join } = require('node:path')

module.exports = { getImportGraph, _resetCache }

let cached = null
let cachedRoot = null

/**
 * Read the import graph from @kaliber/build's esbuild metafile.
 *
 * The metafile is written to `.kaliber-build/server-metafile.json` during
 * build and (with a small @kaliber/build change) during watch mode.
 *
 * Returns null if no metafile exists yet (build hasn't run).
 *
 * @param {string} projectRoot
 * @returns {{ transitiveDeps: (filePath: string) => Set<string>, findChain: (source: string, target: string) => string[] | null } | null}
 */
function getImportGraph(projectRoot) {
  if (cached && cachedRoot === projectRoot) return cached

  const metafilePath = join(projectRoot, '.kaliber-build', 'server-metafile.json')
  if (!existsSync(metafilePath)) return null

  try {
    const metafile = JSON.parse(readFileSync(metafilePath, 'utf-8'))
    cached = parseMetafile(metafile)
    cachedRoot = projectRoot
    return cached
  } catch {
    return null
  }
}

/** @param {object} metafile — esbuild metafile with `inputs` */
function parseMetafile(metafile) {
  /** @type {Map<string, Set<string>>} filePath → direct dependencies */
  const graph = new Map()

  for (const [filePath, info] of Object.entries(metafile.inputs || {})) {
    const deps = new Set()
    for (const imp of info.imports || []) {
      if (imp.path && !imp.external) deps.add(imp.path)
    }
    graph.set(filePath, deps)
  }

  return { transitiveDeps, findChain }

  /** Get ALL transitive dependencies of a file (BFS) */
  function transitiveDeps(filePath) {
    const visited = new Set()
    const queue = [filePath]

    while (queue.length) {
      const current = queue.pop()
      if (visited.has(current)) continue
      visited.add(current)
      for (const dep of (graph.get(current) || [])) queue.push(dep)
    }

    visited.delete(filePath)
    return visited
  }

  /** Find the shortest import chain from source to target (BFS) */
  function findChain(source, target) {
    const queue = [[source]]
    const visited = new Set([source])

    while (queue.length) {
      const path = queue.shift()
      const current = path[path.length - 1]

      for (const dep of (graph.get(current) || [])) {
        if (dep === target) return [...path, dep]
        if (!visited.has(dep)) {
          visited.add(dep)
          queue.push([...path, dep])
        }
      }
    }

    return null
  }
}

/** Reset the module-level cache — used in tests */
function _resetCache() {
  cached = null
  cachedRoot = null
}
