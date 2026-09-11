const { getPropertyName } = require('@eslint-community/eslint-utils')
const { readCrossFileSourceCode, resolveModulePath } = require('./module-graph')
const { referenceFor } = require('./expression')

/**
 * Given a callee, which function node does it actually refer to?
 *
 * Four answers, in ascending cost: a local function declaration, a method on
 * a local object or class, an import that resolves to a file on disk, and
 * nothing. Purely a name-resolution question — the resolver above decides
 * what to *do* with the function it gets back.
 *
 * Renames are a documented miss throughout (`import { a as b }`,
 * `module.exports = { x: local }`): guessed-at resolution in a security
 * analysis is worse than an honest gap.
 */
module.exports = { localFunctionFor, localMethodFor, crossFileImportInfo, resolveCrossFileTarget }


/**
 * Resolve a callee to a function declared in this file: a FunctionDeclaration
 * name or a variable initialized with a function expression/arrow.
 * A callee whose receiver has any shape other than a same-file object
 * literal (`obj.helper()` on a class instance, a function parameter, an
 * imported module) is out of scope — resolving those needs receiver type
 * information phase 1 does not have. See localMethodFor for the one
 * member-callee shape that doesn't need it.
 */
function localFunctionFor(sourceCode, callee) {
  if (callee.type !== 'Identifier') return null

  const variable = referenceFor(sourceCode, callee)?.resolved
  const definition = variable?.defs[0]
  if (!definition) return null

  if (definition.type === 'FunctionName') return definition.node
  if (definition.type === 'Variable') {
    const init = definition.node.init
    if (init?.type === 'ArrowFunctionExpression' || init?.type === 'FunctionExpression') return init
  }
  return null
}

/**
 * `obj.helper(x)` where `obj` is a same-file object literal and `helper`
 * is one of its function-valued properties (arrow, function expression,
 * or shorthand method — all the same node shape as a Property's value).
 * One hop only: `obj` must resolve directly to the object literal, not
 * through a chain of aliases, matching the resolution depth used
 * everywhere else in this file.
 */
function localMethodFor(sourceCode, callee) {
  if (callee.type !== 'MemberExpression' || callee.object.type !== 'Identifier') return null

  const name = getPropertyName(callee, sourceCode.getScope(callee))
  if (name === null) return null

  const variable = referenceFor(sourceCode, callee.object)?.resolved
  const definition = variable?.defs[0]
  const init = definition?.type === 'Variable' ? definition.node.init : null
  if (init?.type !== 'ObjectExpression') return null

  const property = init.properties.find(candidate =>
    candidate.type === 'Property' && getPropertyName(candidate, sourceCode.getScope(candidate)) === String(name)
  )
  const value = property?.value
  if (value?.type === 'ArrowFunctionExpression' || value?.type === 'FunctionExpression') return value
  return null
}

/**
 * Two binding shapes name both a module specifier and the *original*
 * exported name in one place: `import { X } from '...'`, and
 * `const { X } = require('...')` (also renamed locally, in either form —
 * the original name is what findExport needs, not the local one). A
 * namespace-style require (`const ns = require('...'); ns.method()`) is
 * a member callee, not an Identifier one, so it never reaches here — a
 * deliberate, narrower exclusion than the destructured forms, matching
 * this feature's one-hop-of-certainty bar rather than guessing through
 * an extra layer of indirection.
 */
function crossFileImportInfo(definition) {
  if (definition?.type === 'ImportBinding') {
    const imported = definition.node.imported
    const importedName = imported?.type === 'Identifier' ? imported.name : (imported?.value ?? null)
    if (!importedName) return null
    return { specifier: String(definition.parent.source.value), importedName }
  }

  if (definition?.type === 'Variable') {
    const init = definition.node.init
    const isRequireCall = init?.type === 'CallExpression'
      && init.callee?.type === 'Identifier' && init.callee.name === 'require'
      && init.arguments[0]?.type === 'Literal'
    if (!isRequireCall) return null

    const property = definition.name.parent
    if (property?.type !== 'Property') return null
    const importedName = property.key?.type === 'Identifier' ? property.key.name
      : property.key?.type === 'Literal' ? String(property.key.value) : null
    if (!importedName) return null

    return { specifier: String(init.arguments[0].value), importedName }
  }

  return null
}

/** The shared first half of every cross-file resolution: specifier -> a real file, read and parsed. */
function resolveCrossFileTarget({ sourceCode, options, filename }, node) {
  if (node.callee.type !== 'Identifier' || !filename) return null

  const variable = referenceFor(sourceCode, node.callee)?.resolved
  const info = crossFileImportInfo(variable?.defs[0])
  if (!info) return null

  const targetPath = resolveModulePath(info.specifier, filename, options.sourceRoot)
  if (!targetPath) return null

  const targetSourceCode = readCrossFileSourceCode(targetPath)
  if (!targetSourceCode) return null

  return { targetPath, importedName: info.importedName, targetSourceCode }
}
