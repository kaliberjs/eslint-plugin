const fs = require('fs')
const path = require('path')
const { Linter } = require('eslint')

/**
 * Cross-file resolution (interprocedural-lite, Phase 1): turning an import
 * specifier into a file on disk, that file into a SourceCode, and an
 * exported name into the function node behind it.
 *
 * Entirely a module-graph concern — no taint, no registry, no scope
 * analysis of the file being linted. Split out of taint.js, where it sat
 * beside 1600 lines of resolver it shares nothing with.
 *
 * The caches are process-lifetime, keyed by absolute path — deliberately not
 * a WeakMap on SourceCode, because there is no SourceCode for a file nobody
 * asked to lint. A single `npm run lint` invocation is a fresh process, so
 * this never needs to see an edit; a persistent daemon (watch mode, an
 * editor extension) would need real invalidation, which this does not have.
 * ponytail: process-lifetime cache, unbounded. Add an eviction policy if a
 * daemon use case ever makes that observably wrong.
 */
const crossFileSourceCache = new Map()
const sourceRootCache = new Map()
const crossFileLinter = new Linter()

/** Cycle guard, shared with taint.js's cross-file recursion. */
const crossFileInProgress = new Set()

module.exports = {
  readCrossFileSourceCode,
  resolveModulePath,
  findExport,
  crossFileInProgress,
}

/**
 * Parse a file nobody asked to lint into a real SourceCode, the same shape
 * every rule already gets from ESLint, so the exact same scope-aware
 * resolution machinery (getPropertyName, findVariable, sourceCode.getScope)
 * works on it unmodified. Cached by path — see the module-level comment
 * above crossFileSourceCache for the invalidation tradeoff.
 */
function readCrossFileSourceCode(absolutePath) {
  if (crossFileSourceCache.has(absolutePath)) return crossFileSourceCache.get(absolutePath)

  let result = null
  try {
    const code = fs.readFileSync(absolutePath, 'utf8')
    let captured = null
    crossFileLinter.verify(code, {
      languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      plugins: {
        capture: { rules: { capture: { create(context) { captured = context.sourceCode; return {} } } } },
      },
      rules: { 'capture/capture': 'error' },
    }, absolutePath)
    result = captured
  } catch {
    result = null
  }

  crossFileSourceCache.set(absolutePath, result)
  return result
}

/**
 * A specifier to an absolute file path, or null if it is out of scope
 * (a bare package specifier — never chase into node_modules) or does not
 * exist on disk under any of the extensions this project uses.
 */
function resolveModulePath(specifier, fromFile, configuredSourceRoot) {
  let base
  if (specifier.startsWith('.')) {
    base = path.resolve(path.dirname(fromFile), specifier)
  } else if (specifier.startsWith('/')) {
    const root = configuredSourceRoot || findDefaultSourceRoot(fromFile)
    if (!root) return null
    base = path.join(root, specifier)
  } else {
    return null
  }

  return resolveExistingFile(base)
}

function resolveExistingFile(base) {
  for (const candidate of [base, `${base}.js`, `${base}.jsx`, path.join(base, 'index.js'), path.join(base, 'index.jsx')]) {
    try {
      if (fs.statSync(candidate).isFile()) return candidate
    } catch {
      // Does not exist, or a permission error — either way, not this candidate.
    }
  }
  return null
}

/**
 * Root-slash imports (`/machinery/x`) are a Kaliber convention resolved by
 * `@kaliber/build`'s own webpack config, which this plugin has no access
 * to. Absent an explicit `settings['@kaliber/security'].sourceRoot`, the
 * nearest ancestor package.json's `src` directory is the same guess
 * `@kaliber/build` projects satisfy by convention. Wrong for a differently
 * laid out project, in which case root-slash imports fall back to a wall —
 * the same outcome as before this feature existed.
 */
function findDefaultSourceRoot(fromFile) {
  const startDir = path.dirname(fromFile)
  if (sourceRootCache.has(startDir)) return sourceRootCache.get(startDir)

  let current = startDir
  let found = null
  while (true) {
    if (fs.existsSync(path.join(current, 'package.json'))) {
      found = path.join(current, 'src')
      break
    }
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }

  sourceRootCache.set(startDir, found)
  return found
}

/**
 * Resolve an exported name to its function node. Four shapes, all
 * name-matching only — `export { local as exported }` and
 * `module.exports = { exported: local }` renames are a documented miss,
 * not guessed at, the same bar as everywhere else in this feature:
 *
 *   export function X() {}
 *   export const X = () => {} / function () {}
 *   export { X }
 *   module.exports = { X }  /  exports.X = ...  /  module.exports.X = ...
 */
function findExport(program, exportedName) {
  for (const statement of program.body) {
    if (statement.type === 'ExportNamedDeclaration') {
      if (statement.declaration) {
        const declaration = statement.declaration
        if (declaration.type === 'FunctionDeclaration' && declaration.id?.name === exportedName) return declaration
        if (declaration.type === 'VariableDeclaration') {
          for (const declarator of declaration.declarations) {
            if (declarator.id.type !== 'Identifier' || declarator.id.name !== exportedName) continue
            const init = declarator.init
            if (init?.type === 'ArrowFunctionExpression' || init?.type === 'FunctionExpression') return init
          }
        }
        continue
      }

      const specifier = statement.specifiers.find(candidate =>
        candidate.exported.name === exportedName && candidate.local.name === exportedName
      )
      if (specifier) return findTopLevelBinding(program, exportedName)
    }

    if (statement.type === 'ExpressionStatement' && statement.expression.type === 'AssignmentExpression') {
      const found = findCommonJsExport(statement.expression, program, exportedName)
      if (found) return found
    }
  }
  return null
}

function findCommonJsExport(assignment, program, exportedName) {
  const { left, right } = assignment

  // exports.X = ... / module.exports.X = ...
  if (left.type === 'MemberExpression' && !left.computed && isExportsTarget(left.object) && left.property?.name === exportedName) {
    if (right.type === 'ArrowFunctionExpression' || right.type === 'FunctionExpression') return right
    if (right.type === 'Identifier') return findTopLevelBinding(program, right.name)
    return null
  }

  // module.exports = { X } / module.exports = { X: function () {} }
  if (isModuleExports(left) && right.type === 'ObjectExpression') {
    for (const property of right.properties) {
      if (property.type !== 'Property') continue
      const keyName = property.key.type === 'Identifier' ? property.key.name
        : property.key.type === 'Literal' ? String(property.key.value) : null
      if (keyName !== exportedName) continue

      if (property.shorthand) return findTopLevelBinding(program, exportedName)
      if (property.value.type === 'ArrowFunctionExpression' || property.value.type === 'FunctionExpression') return property.value
      if (property.value.type === 'Identifier' && property.value.name === exportedName) return findTopLevelBinding(program, exportedName)
    }
  }

  return null
}

/**
 * Find a top-level function/arrow declaration by name, unqualified by how
 * it is exported — the shared last step once an export statement has been
 * matched down to "the binding named X".
 */
function findTopLevelBinding(program, name) {
  for (const statement of program.body) {
    if (statement.type === 'FunctionDeclaration' && statement.id?.name === name) return statement

    if (statement.type === 'VariableDeclaration') {
      for (const declarator of statement.declarations) {
        if (declarator.id.type !== 'Identifier' || declarator.id.name !== name) continue
        const init = declarator.init
        if (init?.type === 'ArrowFunctionExpression' || init?.type === 'FunctionExpression') return init
      }
    }
  }
  return null
}

function isModuleExports(node) {
  return node.type === 'MemberExpression' && !node.computed
    && node.object.type === 'Identifier' && node.object.name === 'module'
    && node.property.type === 'Identifier' && node.property.name === 'exports'
}

function isExportsTarget(node) {
  return (node.type === 'Identifier' && node.name === 'exports') || isModuleExports(node)
}
