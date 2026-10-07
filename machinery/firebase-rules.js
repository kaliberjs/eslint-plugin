const { isFunctionNode } = require('./ast')
const { staticValue } = require('./static-value')

// Helpers for Firebase Realtime Database rules files written as JavaScript
// that builds the rules object. Rule values are folded with staticValue; the
// access checks are textual, on the folded rule expression.

module.exports = { keyOf, pathOf, fieldsOf, accessOf, clientDisjunctsOf }

const ruleKeys = new Set(['.read', '.write', '.validate', '.indexOn'])

/**
 * Who a folded `.read` or `.write` lets in without naming them:
 * - `anyone`: a disjunct that is `true`
 * - `signed-in`: a disjunct with `auth != null` and no `auth.uid` or `auth.token`
 * - `null`: neither
 *
 * With `{ unconditional: true }` the signed-in disjunct must be `auth != null`
 * and nothing else, the shape that grants every request.
 */
function accessOf(value, { unconditional = false } = {}) {
  const disjuncts = clientDisjunctsOf(value)

  if (disjuncts.includes('true')) return 'anyone'
  if (disjuncts.some(x => !unconditional || /^auth\s*!==?\s*null$/.test(x))) return 'signed-in'

  return null
}

function clientDisjunctsOf(value) {
  if (value === true) return ['true']
  if (typeof value !== 'string') return []

  return disjunctsOf(value).filter(x => x === 'true' || (/auth\s*!==?\s*null/.test(x) && !/auth\.(uid|token)/.test(x)))
}

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

  return parts.length === 1 ? parts.map(x => x.trim()) : parts.flatMap(disjunctsOf)
}

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

// The enclosing object keys up to the nearest function, outermost first,
// without the `rules` root and anything above it.
function pathOf(node, sourceCode) {
  const keys = []

  for (let x = node.parent; x && !isFunctionNode(x); x = x.parent) {
    if (x.type === 'Property') keys.unshift(keyOf(x, sourceCode) ?? '?')
  }

  const root = keys.lastIndexOf('rules')

  return root === -1 ? keys : keys.slice(root + 1)
}

// The data fields beside a rule: its sibling keys that are not rules.
function fieldsOf(node, sourceCode) {
  return node.parent.properties
    .filter(x => x.type === 'Property' && x !== node && !ruleKeys.has(keyOf(x, sourceCode)))
}

function keyOf(property, sourceCode) {
  if (!property.computed) return property.key.type === 'Identifier' ? property.key.name : String(property.key.value)

  const key = staticValue(property.key, sourceCode)

  return typeof key.value === 'string' ? key.value : null
}
