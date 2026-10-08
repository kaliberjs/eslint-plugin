const { isFunctionNode } = require('./ast')
const { staticValue } = require('./static-value')

// Helpers for Firebase Realtime Database rules files written as JavaScript
// that builds the rules object. Rule values are folded with staticValue; the
// access checks are textual, on the folded rule expression.

module.exports = { keyOf, pathOf, fieldsOf, accessOf, isOpenToClients, audienceOf, clientDisjunctsOf }

const signedInCheck = /auth\s*!==?\s*null/
const bareSignedInCheck = /^auth\s*!==?\s*null$/
const namedClientCheck = /auth\.(uid|token)/

/**
 * Who a folded `.read` or `.write` lets in without naming them.
 *
 * @example
 * accessOf('auth != null && newData.exists()')                          // 'signed-in'
 * accessOf('auth != null && newData.exists()', { unconditional: true }) // null
 * accessOf("auth.uid === 'worker' || true")                             // 'anyone'
 *
 * @param {unknown} value - a folded rule value
 * @param {{ unconditional?: boolean }} [options] - with `unconditional`, the
 *   signed-in disjunct must be `auth != null` and nothing else, the shape that
 *   grants every request
 * @returns {Access | null} `anyone` for a `true` disjunct, `signed-in` for
 *   `auth != null` without `auth.uid` or `auth.token`, `null` for neither
 */
function accessOf(value, { unconditional = false } = {}) {
  const disjuncts = clientDisjunctsOf(value)

  if (disjuncts.includes('true')) return 'anyone'
  if (disjuncts.some(disjunct => !unconditional || bareSignedInCheck.test(disjunct))) return 'signed-in'

  return null
}

/**
 * @param {unknown} value - a folded rule value
 * @returns {boolean} whether the rule lets some client in without naming it
 */
function isOpenToClients(value) {
  return accessOf(value) !== null
}

/**
 * @param {Access} access
 * @returns {string} who the access reaches, for a report message
 */
function audienceOf(access) {
  return access === 'anyone' ? 'anyone' : 'any signed-in client'
}

/**
 * The top-level `||` branches of a folded rule that let a client in without
 * naming it: `true`, or `auth != null` without `auth.uid` or `auth.token`.
 *
 * @param {unknown} value - a folded rule value
 * @returns {string[]}
 */
function clientDisjunctsOf(value) {
  if (value === true) return ['true']
  if (typeof value !== 'string') return []

  return disjunctsOf(value).filter(letsClientIn)
}

/**
 * @param {string} disjunct
 * @returns {boolean} `true`, or a signed-in check that names no uid or token claim
 */
function letsClientIn(disjunct) {
  return disjunct === 'true' || (signedInCheck.test(disjunct) && !namedClientCheck.test(disjunct))
}

/**
 * @param {string} expression
 * @returns {string[]} the top-level `||` branches, flattened, outer parentheses removed
 */
function disjunctsOf(expression) {
  const text = unwrapParentheses(expression.trim())
  const parts = []
  let depth = 0
  let start = 0

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') depth++
    if (text[i] === ')') depth--
    if (depth === 0 && text.startsWith('||', i)) {
      parts.push(text.slice(start, i))
      start = i + 2
    }
  }
  parts.push(text.slice(start))

  return parts.length === 1 ? parts.map(part => part.trim()) : parts.flatMap(disjunctsOf)
}

/**
 * @param {string} text
 * @returns {string} `text` without parentheses that wrap all of it
 */
function unwrapParentheses(text) {
  if (!text.startsWith('(') || !text.endsWith(')')) return text

  let depth = 0

  for (let i = 0; i < text.length - 1; i++) {
    if (text[i] === '(') depth++
    if (text[i] === ')') depth--
    if (depth === 0) return text
  }

  return unwrapParentheses(text.slice(1, -1).trim())
}

/**
 * The enclosing object keys up to the nearest function, outermost first,
 * without the `rules` root and anything above it. A key that does not fold
 * is `?`.
 *
 * @param {import('eslint').Rule.Node} node
 * @param {SourceCode} sourceCode
 * @returns {string[]}
 */
function pathOf(node, sourceCode) {
  const keys = []

  for (let ancestor = node.parent; ancestor && !isFunctionNode(ancestor); ancestor = ancestor.parent) {
    if (ancestor.type === 'Property') keys.unshift(keyOf(ancestor, sourceCode) ?? '?')
  }

  const root = keys.lastIndexOf('rules')

  return root === -1 ? keys : keys.slice(root + 1)
}

/**
 * A data key can't contain `.` or `$`
 * (https://firebase.google.com/docs/database/usage/limits), so in a rules
 * object a key that starts with `.` is a rule and one that starts with `$` is a
 * wildcard.
 *
 * @param {string} key
 * @returns {boolean}
 */
function isDataKey(key) {
  return !key.startsWith('.') && !key.startsWith('$')
}

/**
 * The data fields beside a rule: its sibling keys that are neither rules nor wildcards.
 *
 * @param {RuleProperty} node - a `.read`, `.write` or `.validate` property
 * @param {SourceCode} sourceCode
 * @returns {Property[]}
 */
function fieldsOf(node, sourceCode) {
  if (node.parent.type !== 'ObjectExpression') return []

  return node.parent.properties
    .filter(/** @returns {sibling is Property} */ sibling => sibling.type === 'Property')
    .filter(sibling => sibling !== node && isDataKey(keyOf(sibling, sourceCode) ?? ''))
}

/**
 * @param {Property} property
 * @param {SourceCode} sourceCode
 * @returns {string | null} the key's name, or `null` for a computed key that does not fold to a string
 */
function keyOf(property, sourceCode) {
  const { key } = property

  if (!property.computed) return key.type === 'Identifier' ? key.name : key.type === 'Literal' ? String(key.value) : null

  const folded = staticValue(key, sourceCode)

  return typeof folded.value === 'string' ? folded.value : null
}

/** @typedef {'anyone' | 'signed-in'} Access */
/** @typedef {import('eslint').SourceCode} SourceCode */
/** @typedef {import('estree').Property} Property */
/** @typedef {Property & import('eslint').Rule.NodeParentExtension} RuleProperty */
