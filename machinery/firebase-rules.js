const { getPropertyName, isFunctionNode } = require('./ast')
const { staticValue } = require('./static-value')

// Helpers for Firebase Realtime Database rules files written as JavaScript that builds the rules
// object. Rule values are folded with staticValue; the access checks are textual, on the folded
// rule expression.

module.exports = {
  forEachAccessRule, optionsSchema,
  accessOf, isOpenToClients, audienceOf, clientDisjunctsOf,
}

const signedInCheck = /auth\s*!==?\s*null/
const bareSignedInCheck = /^auth\s*!==?\s*null$/
const namedClientCheck = /auth\.(uid|token)/

/**
 * An ESLint visitor that calls `visit` with every `.read` and `.write` in the file, folded with
 * the `env` option.
 *
 * @param {import('eslint').Rule.RuleContext} context
 * @param {(rule: AccessRule) => void} visit
 * @returns {import('eslint').Rule.RuleListener}
 */
function forEachAccessRule(context, visit) {
  const { sourceCode } = context
  const { env = {} } = context.options[0] ?? {}
  /** @param {Node} node */
  const fold = node => staticValue(node, sourceCode, env)

  return {
    Property(node) {
      const key = keyOf(node, sourceCode)

      if (key === '.read' || key === '.write') visit(accessRule(node, key, sourceCode, fold))
    },
  }
}

/**
 * @param {Record<string, import('json-schema').JSONSchema4>} [properties] - the rule's own
 *   options, beside `env`
 * @returns {import('json-schema').JSONSchema4[]}
 */
function optionsSchema(properties = {}) {
  /** @type {import('json-schema').JSONSchema4} */
  const env = { type: 'object', additionalProperties: { type: 'string' } }

  return [{ type: 'object', properties: { env, ...properties }, additionalProperties: false }]
}

/**
 * @param {RuleProperty} node
 * @param {AccessKey} key
 * @param {SourceCode} sourceCode
 * @param {(node: Node) => Folded} fold
 * @returns {AccessRule}
 */
function accessRule(node, key, sourceCode, fold) {
  const { value, unresolved } = fold(node.value)
  const path = pathOf(node, sourceCode)

  return {
    node, key, value, unresolved, path, fold,
    location: path.join('/') || 'the root',
    fields: fieldsOf(node, sourceCode),
    above: () => rulesAbove(node, key, sourceCode)
      .map(rule => accessRule(rule, key, sourceCode, fold)),
  }
}

/**
 * Who a folded `.read` or `.write` lets in without naming them.
 *
 * @example
 * accessOf('auth != null && newData.exists()')                          // 'signed-in'
 * accessOf('auth != null && newData.exists()', { unconditional: true }) // null
 * accessOf("auth.uid === 'worker' || true")                             // 'anyone'
 *
 * @param {unknown} value - a folded rule value
 * @param {{ unconditional?: boolean }} [options] - with `unconditional`, the signed-in disjunct
 *   must be `auth != null` and nothing else, the shape that grants every request
 * @returns {Access | null} `anyone` for a `true` disjunct, `signed-in` for `auth != null` without
 *   `auth.uid` or `auth.token`, `null` for neither
 */
function accessOf(value, { unconditional = false } = {}) {
  const disjuncts = clientDisjunctsOf(value)

  if (disjuncts.includes('true')) return 'anyone'
  if (disjuncts.some(x => !unconditional || bareSignedInCheck.test(x))) return 'signed-in'

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
 * The top-level `||` branches of a folded rule that let a client in without naming it: `true`,
 * or `auth != null` without `auth.uid` or `auth.token`.
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
  return disjunct === 'true' ||
    (signedInCheck.test(disjunct) && !namedClientCheck.test(disjunct))
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
 * The object keys enclosing `node` up to the nearest function, outermost first, without the
 * `rules` root and anything above it. A key that does not fold is `?`.
 *
 * @param {RuleNode} node
 * @param {SourceCode} sourceCode
 * @returns {string[]}
 */
function pathOf(node, sourceCode) {
  const keys = ancestorsOf(node)
    .filter(ancestor => ancestor.type === 'Property')
    .map(property => keyOf(property, sourceCode) ?? '?')
    .reverse()
  const root = keys.lastIndexOf('rules')

  return root === -1 ? keys : keys.slice(root + 1)
}

/**
 * The rules with the same key in the objects enclosing `node`, nearest first.
 *
 * @param {RuleNode} node
 * @param {AccessKey} key
 * @param {SourceCode} sourceCode
 * @returns {RuleProperty[]}
 */
function rulesAbove(node, key, sourceCode) {
  return ancestorsOf(node.parent ?? node)
    .flatMap(ancestor => ancestor.type === 'ObjectExpression' ? ancestor.properties : [])
    .filter(property => property.type === 'Property' && keyOf(property, sourceCode) === key)
    .map(property => /** @type {RuleProperty} */ (property))
}

/**
 * @param {RuleNode} node
 * @returns {RuleNode[]} the nodes enclosing `node`, nearest first, up to the nearest function
 */
function ancestorsOf(node) {
  const ancestors = []

  for (let x = node.parent; x && !isFunctionNode(x); x = x.parent) ancestors.push(x)

  return ancestors
}

/**
 * The data fields beside a rule: its sibling keys that are neither rules nor wildcards.
 *
 * @param {RuleProperty} node
 * @param {SourceCode} sourceCode
 * @returns {Field[]}
 */
function fieldsOf(node, sourceCode) {
  if (node.parent.type !== 'ObjectExpression') return []

  return node.parent.properties
    .filter(/** @returns {x is Property} */ x => x.type === 'Property' && x !== node)
    .map(property => ({ node: property, name: keyOf(property, sourceCode) }))
    .filter(field => isDataKey(field.name))
}

/**
 * A data key can't contain `.` or `$` (https://firebase.google.com/docs/database/usage/limits),
 * so in a rules object a key that starts with `.` is a rule and one that starts with `$` is a
 * wildcard.
 *
 * @param {string | null} key
 * @returns {boolean}
 */
function isDataKey(key) {
  return !key?.startsWith('.') && !key?.startsWith('$')
}

/**
 * @param {Property} property
 * @param {SourceCode} sourceCode
 * @returns {string | null} the key's name, or `null` for a computed key that does not fold to a
 *   string
 */
function keyOf(property, sourceCode) {
  if (!property.computed) return String(getPropertyName(property.key))

  const { value } = staticValue(property.key, sourceCode)

  return typeof value === 'string' ? value : null
}

/** @typedef {import('estree').Node} Node */
/** @typedef {import('estree').Property} Property */
/** @typedef {import('eslint').Rule.Node} RuleNode */
/** @typedef {import('eslint').SourceCode} SourceCode */
/** @typedef {Property & import('eslint').Rule.NodeParentExtension} RuleProperty */
/** @typedef {{ value?: unknown, unresolved?: string }} Folded */
/** @typedef {'anyone' | 'signed-in'} Access */
/** @typedef {'.read' | '.write'} AccessKey */
/** @typedef {{ node: Property, name: string | null }} Field */
/**
 * A `.read` or `.write`, folded.
 *
 * @typedef {{
 *   node: RuleProperty,
 *   key: AccessKey,
 *   value: unknown,
 *   unresolved?: string,
 *   path: string[],
 *   location: string,
 *   fields: Field[],
 *   fold: (node: Node) => Folded,
 *   above: () => AccessRule[],
 * }} AccessRule
 *   `location` is the path joined with `/`, or `the root`; `fields` are the data keys beside it;
 *   `fold` folds another node with the same `env`; `above` is the rules with the same key in the
 *   enclosing objects, nearest first
 */
