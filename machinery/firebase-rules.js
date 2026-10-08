const { getPropertyName, isFunctionNode } = require('./ast')
const { staticValue } = require('./static-value')

// Helpers for Firebase Realtime Database rules files written as JavaScript that builds the rules
// object. Rule values are folded with staticValue; the access checks are textual, on the folded
// rule expression.

module.exports = {
  forEachAccessRule, forEachShape, optionsSchema,
  accessOf, isOpenToClients, audienceOf, clientDisjunctsOf, isValidation,
}

const signedInCheck = /auth\s*!==?\s*null/
const bareSignedInCheck = /^auth\s*!==?\s*null$/
const namedClientCheck = /auth\.(uid|token)/
const validateKey = /['"]\.validate['"]/

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

  return {
    Property(node) {
      const key = keyOf(node, sourceCode)

      if (key === '.read' || key === '.write') visit(accessRule(node, key, sourceCode, fold))
    },
  }

  /** @param {Node} node */
  function fold(node) {
    return staticValue(node, sourceCode, env)
  }
}

/**
 * An ESLint visitor that calls `visit` with every shape in the file: an object with a data key
 * whose rule folds to a `.validate`. A file without a `.validate` key is skipped.
 *
 * @param {import('eslint').Rule.RuleContext} context
 * @param {(shape: Shape) => void} visit
 * @returns {import('eslint').Rule.RuleListener}
 */
function forEachShape(context, visit) {
  const { sourceCode } = context
  const { env = {} } = context.options[0] ?? {}

  if (!validateKey.test(sourceCode.text)) return {}

  return {
    ObjectExpression(node) {
      const keys = keysOf(node, sourceCode)
      const fields = keys.filter(key => isDataKey(key.name))
      const wildcards = keys.filter(key => key.name?.startsWith('$'))

      if (!fields.some(field => isValidation(fold(field.node.value).value))) return

      const location = pathOf(node, sourceCode).join('/') || 'the root'
      const at = node.parent.type === 'Property' ? node.parent.key : node
      const writes = [node, ...ancestorsOf(node, sourceCode)]
        .flatMap(object => object.type === 'ObjectExpression' ? keysOf(object, sourceCode) : [])
        .filter(key => key.name === '.write')
      const openToClients = writes.some(write => isOpenToClients(fold(write.node.value).value))

      visit({ node, at, location, fields, wildcards, openToClients, fold })
    },
  }

  /** @param {Node} node */
  function fold(node) {
    return staticValue(node, sourceCode, env)
  }
}

/**
 * Whether a folded value is a rule object with a `.validate`.
 *
 * @param {unknown} value
 */
function isValidation(value) {
  return typeof value === 'object' && value !== null && Object.hasOwn(value, '.validate')
}

/**
 * @param {Record<string, import('json-schema').JSONSchema4>} [properties] - the rule's own
 *   options, beside `env`
 * @param {string[]} [required] - options the rule can't run without
 * @returns {import('json-schema').JSONSchema4}
 */
function optionsSchema(properties = {}, required = []) {
  /** @type {import('json-schema').JSONSchema4} */
  const env = { type: 'object', additionalProperties: { type: 'string' } }
  /** @type {import('json-schema').JSONSchema4} */
  const options = {
    type: 'object',
    properties: { env, ...properties },
    ...required.length && { required },
    additionalProperties: false,
  }

  return { type: 'array', items: [options], minItems: required.length ? 1 : 0, maxItems: 1 }
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
    node, key, value, unresolved, path, fold, above,
    location: path.join('/') || 'the root',
    fields: fieldsOf(node, sourceCode),
  }

  function above() {
    return rulesAbove(node, key, sourceCode).map(rule => accessRule(rule, key, sourceCode, fold))
  }
}

/**
 * Who a folded `.read` or `.write` lets in without naming them: `anyone` for a `true` disjunct,
 * `signed-in` for `auth != null` without `auth.uid` or `auth.token`, `null` for neither.
 *
 * @example
 * accessOf('auth != null && newData.exists()')                          // 'signed-in'
 * accessOf('auth != null && newData.exists()', { unconditional: true }) // null
 * accessOf("auth.uid === 'worker' || true")                             // 'anyone'
 *
 * @param {unknown} value - a folded rule value
 * @param {{ unconditional?: boolean }} [options] - with `unconditional`, the signed-in disjunct
 *   must be `auth != null` and nothing else, the shape that grants every request
 */
function accessOf(value, { unconditional = false } = {}) {
  const disjuncts = clientDisjunctsOf(value)

  if (disjuncts.includes('true')) return 'anyone'
  if (disjuncts.some(x => !unconditional || bareSignedInCheck.test(x))) return 'signed-in'

  return null
}

/**
 * Whether the rule lets some client in without naming it.
 *
 * @param {unknown} value - a folded rule value
 */
function isOpenToClients(value) {
  return accessOf(value) !== null
}

/**
 * Who the access reaches, for a report message.
 *
 * @param {Access | null} access
 */
function audienceOf(access) {
  return access === 'anyone' ? 'anyone' : 'any signed-in client'
}

/**
 * The top-level `||` branches of a folded rule that let a client in without naming it: `true`,
 * or `auth != null` without `auth.uid` or `auth.token`.
 *
 * @param {unknown} value - a folded rule value
 */
function clientDisjunctsOf(value) {
  if (value === true) return ['true']
  if (typeof value !== 'string') return []

  return disjunctsOf(value).filter(letsClientIn)
}

/**
 * `true`, or a signed-in check that names no uid or token claim.
 *
 * @param {string} disjunct
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
 */
function pathOf(node, sourceCode) {
  const keys = ancestorsOf(node, sourceCode)
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
 */
function rulesAbove(node, key, sourceCode) {
  return ancestorsOf(node, sourceCode)
    .slice(1)
    .flatMap(ancestor => ancestor.type === 'ObjectExpression' ? ancestor.properties : [])
    .filter(property => property.type === 'Property' && keyOf(property, sourceCode) === key)
    .map(property => /** @type {RuleProperty} */ (property))
}

/**
 * The nodes enclosing `node`, nearest first, up to the nearest function.
 *
 * @param {Node} node
 * @param {SourceCode} sourceCode
 */
function ancestorsOf(node, sourceCode) {
  const ancestors = sourceCode.getAncestors(node)

  return ancestors.slice(ancestors.findLastIndex(isFunctionNode) + 1).reverse()
}

/**
 * The data fields beside a rule: its sibling keys that are neither rules nor wildcards.
 *
 * @param {RuleProperty} node
 * @param {SourceCode} sourceCode
 */
function fieldsOf(node, sourceCode) {
  if (node.parent.type !== 'ObjectExpression') return []

  return keysOf(node.parent, sourceCode).filter(key => key.node !== node && isDataKey(key.name))
}

/**
 * @param {import('estree').ObjectExpression} object
 * @param {SourceCode} sourceCode
 * @returns {Field[]}
 */
function keysOf(object, sourceCode) {
  return object.properties
    .filter(/** @returns {x is Property} */ x => x.type === 'Property')
    .map(property => ({ node: property, name: keyOf(property, sourceCode) }))
}

/**
 * A data key can't contain `.` or `$` (https://firebase.google.com/docs/database/usage/limits),
 * so in a rules object a key that starts with `.` is a rule and one that starts with `$` is a
 * wildcard.
 *
 * @param {string | null} key
 */
function isDataKey(key) {
  return !key?.startsWith('.') && !key?.startsWith('$')
}

/**
 * The key's name, or `null` for a computed key that does not fold to a string.
 *
 * @param {Property} property
 * @param {SourceCode} sourceCode
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
/** @typedef {{ value?: unknown, unresolved?: boolean }} Folded */
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
 *   unresolved?: boolean,
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
/**
 * An object that validates its fields.
 *
 * @typedef {{
 *   node: import('estree').ObjectExpression,
 *   at: Node,
 *   location: string,
 *   fields: Field[],
 *   wildcards: Field[],
 *   openToClients: boolean,
 *   fold: (node: Node) => Folded,
 * }} Shape
 *   `at` is the key that holds the shape, or the object itself, to report at; `fields` are its
 *   data keys, `wildcards` its `$` keys; `openToClients` whether a `.write` on it or above it lets
 *   some client in
 */
