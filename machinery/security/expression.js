const { getPropertyName } = require('@eslint-community/eslint-utils')

module.exports = {
  referenceFor,
  memberChain, shortText, calleeText,
  isGlobalNamed, isGlobalConstructorNamed,
  isNonTrivialStringLiteral,
  unwrap, isPrefix,
}

/**
 * Identifier -> Reference, O(1), built from arrays ESLint already populated.
 *
 * Keyed by SourceCode rather than built per analysis, so this stays a plain
 * function instead of a factory: ESLint makes a new SourceCode for every
 * parse, which is the same natural invalidation `analyze` relies on.
 */
const referenceIndexes = new WeakMap()

function referenceFor(sourceCode, identifier) {
  let index = referenceIndexes.get(sourceCode)

  if (!index) {
    index = new Map()
    for (const scope of sourceCode.scopeManager.scopes)
      for (const reference of scope.references)
        index.set(reference.identifier, reference)
    referenceIndexes.set(sourceCode, index)
  }

  return index.get(identifier) ?? null
}

/**
 * `document.URL` -> { root: <document>, path: ['URL'] }
 *
 * A computed segment we cannot fold makes the whole chain unusable for
 * *source matching* — the path would be wrong rather than merely unknown.
 * Taint still propagates through it via resolveMember's object walk.
 */
function memberChain(sourceCode, node) {
  const path = []
  let current = node

  while (current.type === 'MemberExpression') {
    const name = getPropertyName(current, sourceCode.getScope(current))
    if (name === null) return { root: null, path: [] }
    path.unshift(String(name))
    current = unwrap(current.object)
  }

  return { root: current, path }
}

function shortText(sourceCode, node) {
  return sourceCode.getText(node).replace(/\s+/g, ' ').trim()
}

/**
 * A callee's text on one line, for a flow-path label. Unlike shortText this
 * does not trim or truncate: it must be resolved in the *caller's* file
 * before crossing a file boundary, where the target analysis has no way to
 * read text from this node.
 */
function calleeText(sourceCode, callee) {
  return sourceCode.getText(callee).replace(/\s+/g, ' ')
}

/**
 * Is this identifier a reference to the *global* of that name?
 *
 * Not the same question as "does it fail to resolve". A config that declares
 * `globals.browser` gives `location` a real Variable in the global scope with
 * no definitions, so testing for an unresolved reference finds nothing — and
 * silently finding nothing looks exactly like being secure. A shadowing
 * `const location = ...` has a definition, and correctly does not match.
 */
function isGlobalNamed(sourceCode, identifier, name) {
  if (!name || identifier.type !== 'Identifier' || identifier.name !== name) return false
  return isUnshadowedGlobal(sourceCode, identifier)
}

/** Same shadowing check as isGlobalNamed, but for the regex-matched constructors. */
function isGlobalConstructorNamed(sourceCode, identifier, pattern) {
  if (!pattern || identifier.type !== 'Identifier' || !pattern.test(identifier.name)) return false
  return isUnshadowedGlobal(sourceCode, identifier)
}

function isUnshadowedGlobal(sourceCode, identifier) {
  const variable = referenceFor(sourceCode, identifier)?.resolved
  if (!variable) return true

  return !variable.defs.length && variable.scope.type === 'global'
}

/**
 * A string literal long enough to be a real secret rather than a placeholder
 * ('', 'x', 'dev'). no-weak-jwt-secret and no-hardcoded-credentials each had
 * this under a different name with the same four-character floor; one of them
 * moving the floor without the other would have been invisible.
 */
function isNonTrivialStringLiteral(node, minLength = 4) {
  return node?.type === 'Literal'
    && typeof node.value === 'string'
    && node.value.length >= minLength
}

/** Strip wrappers that cannot change the value. */
function unwrap(node) {
  switch (node.type) {
    case 'ChainExpression': return unwrap(node.expression)
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
    case 'TSTypeAssertion':
    case 'TSNonNullExpression':
    case 'TSInstantiationExpression':
      return unwrap(node.expression)
    case 'AwaitExpression': return unwrap(node.argument)
    case 'SequenceExpression': return unwrap(node.expressions.at(-1))
    default: return node
  }
}

/**
 * A source path matches any deeper access beneath it: `req.query` being
 * untrusted makes `req.query.filter.name` untrusted too. Requiring an exact
 * length match broke `const { query: { id } } = req` — the destructured form
 * of the same access — and would have made path-qualified sources a false
 * negative rather than a narrowing.
 */
function isPrefix(prefix, path) {
  return prefix.length <= path.length && prefix.every((segment, i) => segment === path[i])
}
