const { getPropertyName } = require('@eslint-community/eslint-utils')
const { isGlobalNamed } = require('./expression')
const { matchesPattern, matchesReceiver } = require('./registry-pattern')

/**
 * Does this call clear taint, and for which kinds?
 *
 * Sanitization is typed: a value escaped for HTML is still tainted for SQL.
 * A function is *never* a sanitizer because it is named `sanitize`, `clean`,
 * `escape` or `validate` — only an explicit registry.js#sanitizers entry
 * makes it one. That rule is the whole reason this file is three functions
 * and not a heuristic.
 */
module.exports = { sanitizerFor, sanitizedAt }

function sanitizerFor(known, sourceCode, callee) {
  if (callee.type === 'Identifier') {
    // A local named `Number` shadows the global and must not be trusted.
    const global = known.sanitizers.find(sanitizer => sanitizer.root.global && isGlobalNamed(sourceCode, callee, sanitizer.root.global))
    if (global) return global

    // Helper-rooted sanitizers: bare calls of a name the consumer
    // explicitly declared trustworthy (`root: { helper: 'i18n' }`). The
    // shape itself records that name-trust was a decision, which is what
    // separates this from the forbidden bare-method matching.
    return known.sanitizers.find(sanitizer =>
      matchesPattern(sanitizer.root.helper, callee.name)
    ) ?? null
  }

  if (callee.type === 'MemberExpression') {
    const name = getPropertyName(callee, sourceCode.getScope(callee))
    if (name === null) return null

    // The receiver constraint is mandatory for method-rooted sanitizers (the
    // registry refuses to load one without it). `escape` is why: lodash, he
    // and validator all export an HTML escaper by that name, and trusting one
    // of those as a SQL escaper turns detection off silently.
    return known.sanitizers.find(sanitizer =>
      matchesPattern(sanitizer.root.method, String(name)) &&
      (!sanitizer.root.receiver || matchesReceiver(sourceCode, callee.object, sanitizer.root.receiver))
    ) ?? null
  }

  return null
}

/**
 * Has this expression been passed through a registered sanitizer for the
 * kind? Unlike taintOf — which returns null when the *input* was untainted,
 * indistinguishable from "no sanitizer here" — this answers the question
 * matcher-style rules (no-dangerously-set-inner-html) actually need: was a
 * clearing call made, regardless of whether the argument happened to be
 * tainted.
 */
function sanitizedAt(known, sourceCode, node, kind) {
  if (node?.type !== 'CallExpression') return false
  const sanitizer = sanitizerFor(known, sourceCode, node.callee)
  return Boolean(sanitizer && (sanitizer.clears.includes('*') || sanitizer.clears.includes(kind)))
}
