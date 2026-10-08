const { getPropertyName, isFunctionNode } = require('./ast')
const { staticValue } = require('./static-value')

// ESLint's own parser, resolved from ESLint itself: its dependency, not a new one of ours.
const espree = require(require.resolve('espree', { paths: [require.resolve('eslint')] }))

// Helpers for Firebase Realtime Database rules files written as JavaScript that builds the rules
// object. Rule values are folded with staticValue, then parsed as the JavaScript expressions they
// are.

module.exports = { forEachAccessRule, forEachShape, audienceOf, isValidation }

const signedInCheck = /auth\s*!==?\s*null/
const bareSignedInCheck = /^auth\s*!==?\s*null$/
const namedClientCheck = /auth\.(uid|token)/
const validateKey = /['"]\.validate['"]/

/**
 * An ESLint visitor that calls `visit` with every `.read` and `.write` in the file.
 *
 * @param {import('eslint').Rule.RuleContext} context
 * @param {(rule: AccessRule) => void} visit
 * @returns {import('eslint').Rule.RuleListener}
 */
function forEachAccessRule(context, visit) {
  const { sourceCode } = context

  return {
    Property(node) {
      const key = keyOf(node, sourceCode)

      if (key === '.read' || key === '.write') visit(accessRule(node, key, sourceCode))
    },
  }
}

/**
 * An ESLint visitor that calls `visit` with every shape in the file. A file without a `.validate`
 * key is skipped.
 *
 * @param {import('eslint').Rule.RuleContext} context
 * @param {(shape: Shape) => void} visit
 * @returns {import('eslint').Rule.RuleListener}
 */
function forEachShape(context, visit) {
  const { sourceCode } = context

  if (!validateKey.test(sourceCode.text)) return {}

  return {
    ObjectExpression(node) {
      const shape = shapeOf(node, sourceCode)

      if (shape) visit(shape)
    },
  }
}

/**
 * A `.read` or `.write`, folded, with who it lets in.
 *
 * @param {RuleProperty} node
 * @param {AccessKey} key
 * @param {SourceCode} sourceCode
 * @returns {AccessRule}
 */
function accessRule(node, key, sourceCode) {
  const { value, unresolved } = staticValue(node.value, sourceCode)
  const clientDisjuncts = clientDisjunctsOf(value)
  const path = pathOf(node, sourceCode)

  return {
    node, key, value, unresolved, path, clientDisjuncts, above,
    access: accessOf(clientDisjuncts),
    unconditionalAccess: accessOf(clientDisjuncts.filter(isUnconditional)),
    location: path.join('/') || 'the root',
    fields: fieldsOf(node, sourceCode),
  }

  function above() {
    return rulesIn(ancestorsOf(node, sourceCode).slice(1), key, sourceCode)
  }
}

/**
 * An object with a data key whose rule folds to a `.validate`; `null` for any other object.
 *
 * @param {RuleNode & import('estree').ObjectExpression} node
 * @param {SourceCode} sourceCode
 * @returns {Shape | null}
 */
function shapeOf(node, sourceCode) {
  const keys = keysOf(node, sourceCode)
  const fields = keys.filter(key => isDataKey(key.name))

  if (!fields.some(field => isValidated(field, sourceCode))) return null

  const writes = rulesIn([node, ...ancestorsOf(node, sourceCode)], '.write', sourceCode)

  return {
    node, fields,
    wildcards: keys.filter(key => key.name?.startsWith('$')),
    at: node.parent.type === 'Property' ? node.parent.key : node,
    location: pathOf(node, sourceCode).join('/') || 'the root',
    openToClients: writes.some(write => write.access),
  }
}

/**
 * The `||` branches of a folded rule that let a client in without naming it: `true`, or
 * `auth != null` without `auth.uid` or `auth.token`.
 *
 * @param {unknown} value - a folded rule value
 */
function clientDisjunctsOf(value) {
  if (value === true) return ['true']
  if (typeof value !== 'string') return []

  return disjunctsOf(value).filter(letsClientIn)
}

/**
 * The top-level `||` branches of a rule expression, as text; none when it doesn't parse.
 *
 * @param {string} expression
 */
function disjunctsOf(expression) {
  try {
    const [statement] = espree.parse(expression, { ecmaVersion: 'latest', range: true }).body

    if (statement?.type !== 'ExpressionStatement') return []

    return branchesOf(statement.expression).map(node => expression.slice(...rangeOf(node)))
  } catch {
    return []
  }
}

/** @param {string} disjunct */
function letsClientIn(disjunct) {
  return disjunct === 'true' ||
    (signedInCheck.test(disjunct) && !namedClientCheck.test(disjunct))
}

/**
 * A disjunct that grants every request: `true`, or `auth != null` and nothing else.
 *
 * @param {string} disjunct
 */
function isUnconditional(disjunct) {
  return disjunct === 'true' || bareSignedInCheck.test(disjunct)
}

/**
 * `anyone` when a disjunct is `true`, `signed-in` when any other client disjunct is left, `null`
 * for none.
 *
 * @param {string[]} clientDisjuncts
 * @returns {Access | null}
 */
function accessOf(clientDisjuncts) {
  if (clientDisjuncts.includes('true')) return 'anyone'

  return clientDisjuncts.length ? 'signed-in' : null
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
 * @param {Field} field
 * @param {SourceCode} sourceCode
 */
function isValidated(field, sourceCode) {
  return isValidation(staticValue(field.node.value, sourceCode).value)
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
 * @param {Node} node
 * @returns {Node[]} the branches of a chain of `||`, left to right
 */
function branchesOf(node) {
  if (node.type !== 'LogicalExpression' || node.operator !== '||') return [node]

  return [...branchesOf(node.left), ...branchesOf(node.right)]
}

/**
 * @param {Node} node - a node parsed with `range: true`
 * @returns {[number, number]}
 */
function rangeOf(node) {
  return /** @type {[number, number]} */ (node.range)
}

/**
 * The object keys enclosing `node` up to the nearest function, outermost first, without the
 * `rules` root and anything above it. A key that does not fold is `?`.
 *
 * @param {Node} node
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
 * The `key` rules in `objects`, in order.
 *
 * @param {Node[]} objects
 * @param {AccessKey} key
 * @param {SourceCode} sourceCode
 */
function rulesIn(objects, key, sourceCode) {
  return objects
    .flatMap(object => object.type === 'ObjectExpression' ? keysOf(object, sourceCode) : [])
    .filter(rule => rule.name === key)
    .map(rule => accessRule(/** @type {RuleProperty} */ (rule.node), key, sourceCode))
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
/** @typedef {Property & import('eslint').Rule.NodeParentExtension} RuleProperty */
/** @typedef {import('eslint').SourceCode} SourceCode */
/** @typedef {'anyone' | 'signed-in'} Access */
/** @typedef {'.read' | '.write'} AccessKey */
/** @typedef {{ node: Property, name: string | null }} Field */
/**
 * @typedef {{
 *   node: RuleProperty,
 *   key: AccessKey,
 *   value: unknown,
 *   unresolved?: boolean,
 *   path: string[],
 *   location: string,
 *   fields: Field[],
 *   clientDisjuncts: string[],
 *   access: Access | null,
 *   unconditionalAccess: Access | null,
 *   above: () => AccessRule[],
 * }} AccessRule
 *   `location` is the path joined with `/`, or `the root`; `fields` are the data keys beside it;
 *   `clientDisjuncts` the `||` branches that let a client in without naming it; `access` who they
 *   let in, `unconditionalAccess` who they let in on every request; `above` is the rules with the
 *   same key in the enclosing objects, nearest first
 */
/**
 * @typedef {{
 *   node: import('estree').ObjectExpression,
 *   at: Node,
 *   location: string,
 *   fields: Field[],
 *   wildcards: Field[],
 *   openToClients: boolean,
 * }} Shape
 *   `at` is the key that holds the shape, or the object itself, to report at; `fields` are its
 *   data keys, `wildcards` its `$` keys; `openToClients` whether a `.write` on it or above it lets
 *   some client in
 */
