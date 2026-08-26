const { getPropertyName } = require('@eslint-community/eslint-utils')
const { isGlobalConstructorNamed, isGlobalNamed } = require('./expression')
const { matchesPattern } = require('./registry-pattern')

/**
 * Does taint survive this call, and through which arguments?
 *
 * The mirror of a sanitizer: `input.trim()` and `JSON.parse(input)` carry
 * taint onward rather than clearing it. See registry.js#propagators.
 */
module.exports = { propagatorFor, constructPropagatorFor }

function propagatorFor(known, sourceCode, node) {
  // Global functions: String(x), decodeURIComponent(x), JSON.stringify(x).
  // The registry previously had no way to express these at all, so
  // `db.query('… ' + String(req.query.id))` propagated nothing.
  if (node.callee.type === 'Identifier')
    return known.propagators.find(propagator => isGlobalNamed(sourceCode, node.callee, propagator.global)) ?? null

  if (node.callee.type !== 'MemberExpression') return null

  const name = getPropertyName(node.callee, sourceCode.getScope(node.callee))
  if (name === null) return null

  return known.propagators.find(propagator => {
    if (!matchesPattern(propagator.method, String(name))) return false

    // Namespace-gated propagators (path.join vs Array#join): the receiver
    // object must be the namespace, not a tainted value.
    if (propagator.namespace) {
      const object = node.callee.object
      const objectName = object?.type === 'Identifier'
        ? object.name
        : object?.type === 'MemberExpression' && !object.computed ? object.property?.name : null
      if (!objectName || !propagator.namespace.test(objectName)) return false
    }

    return true
  }) ?? null
}

function constructPropagatorFor(known, sourceCode, node) {
  if (node.callee.type !== 'Identifier') return null
  return known.propagators.find(propagator =>
    propagator.construct && isGlobalConstructorNamed(sourceCode, node.callee, propagator.construct)
  ) ?? null
}
