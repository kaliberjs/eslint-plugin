const { getPropertyName, isFunctionNode } = require('./ast')
const { staticValue } = require('./static-value')

// ESLint's own parser, resolved from ESLint itself: its dependency, not a new one of ours.
const espree = require(require.resolve('espree', { paths: [require.resolve('eslint')] }))

// Helpers for Firebase Realtime Database rules files written as JavaScript that builds the rules
// object. Rule values are folded with staticValue, then parsed as the JavaScript expressions they
// are.

const signedInCheck = /auth(\.uid)?\s*!==?\s*null/
const bareSignedInCheck = /^auth(\.uid)?\s*!==?\s*null$/
const namedClientCheck = /auth\.uid\s*===?|===?\s*auth\.uid|auth\.token/
const validateKey = /['"]\.validate['"]/
const accessKey = /['"]\.(read|write)['"]/
const camelCaseBoundary = /([a-z0-9])([A-Z])/g
const nonAlphanumerics = /[^a-z0-9]+/

// The words Kaliber's rules files use for data a worker trusts (`verified-queue`, `isEmployee`).
const trustWords = ['verified', 'employee']

module.exports = {
  forEachAccessRule, forEachShape, forEachRulesKey,
  audienceOf, isValidation, ruleText, addProperty, trustWords, trustClaimsOf,
}

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
 * An ESLint visitor that calls `visit` with every shape in the file: an object with validated
 * fields, or with an `$other`. A file without a `.validate` key is skipped.
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
  const clientDisjuncts = disjunctsIn(value).filter(letsClientIn)
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
  const validatesFields = fields.some(field => isValidated(field, sourceCode))

  if (!validatesFields && !keys.some(key => key.name === '$other')) return null

  const writes = rulesIn([node, ...ancestorsOf(node, sourceCode)], '.write', sourceCode)
  const path = pathOf(node, sourceCode)

  return {
    node, fields, validatesFields,
    wildcards: keys.filter(key => key.name?.startsWith('$')),
    validate: keys.find(key => key.name === '.validate') ?? null,
    at: node.parent.type === 'Property' ? node.parent.key : node,
    location: path.join('/') || 'the root',
    openToClients: writes.some(write => write.access),
    level: levelOf(path),
    service: serviceOf(path, sourceCode),
  }
}

/**
 * `record` for the first `$` wildcard in the path (a queue task, a subscription), `data` for an
 * object a record holds, `null` above any record.
 *
 * @param {string[]} path
 * @returns {'record' | 'data' | null}
 */
function levelOf(path) {
  const record = path.findIndex(key => key.startsWith('$'))

  if (record === -1) return null

  return record === path.length - 1 ? 'record' : 'data'
}

/**
 * The service a shape sits under, `services/<name>`, with the check named after it when the file
 * defines one; `null` outside `services`.
 *
 * @param {string[]} path
 * @param {SourceCode} sourceCode
 * @returns {Service | null}
 */
function serviceOf(path, sourceCode) {
  const name = path[path.indexOf('services') + 1]

  if (!path.includes('services') || !name) return null

  return { name, check: serviceCheckOf(name, sourceCode) }
}

/**
 * The `const` in the file whose rule is exactly `auth.uid === '<name>'`.
 *
 * @param {string} name - a service name
 * @param {SourceCode} sourceCode
 */
function serviceCheckOf(name, sourceCode) {
  const constants = sourceCode.ast.body
    .flatMap(statement => statement.type === 'VariableDeclaration' && statement.kind === 'const'
      ? statement.declarations
      : [])

  for (const { id, init } of constants) {
    if (id.type !== 'Identifier' || !init) continue

    const { value } = staticValue(init, sourceCode)

    if (typeof value !== 'string' || !isUidCheck(value, name)) continue

    return { identifier: id.name, rule: value }
  }

  return null
}

/**
 * @param {string} rule
 * @param {string} name
 */
function isUidCheck(rule, name) {
  return withoutParentheses(rule) === `auth.uid === '${name}'` ||
    withoutParentheses(rule) === `auth.uid == '${name}'`
}

/** @param {string} rule */
function withoutParentheses(rule) {
  return rule.trim().replace(/^\((.*)\)$/, '$1').trim()
}

/**
 * The source text for a rule object with `.validate` set to `expression`: the file's own
 * `validate(…)` helper when it has one, an object literal otherwise.
 *
 * @param {string} expression - source text, e.g. `false` or `isJobAlertSubscriptionService`
 * @param {Node} at - a node in the scope that will hold the text
 * @param {SourceCode} sourceCode
 */
function ruleText(expression, at, sourceCode) {
  const helper = findVariable(sourceCode.getScope(at), 'validate')

  return helper ? `validate(${expression})` : `{ '.validate': ${expression} }`
}

/**
 * @param {import('eslint').Scope.Scope | null} scope
 * @param {string} name
 */
function findVariable(scope, name) {
  for (let current = scope; current; current = current.upper) {
    const variable = current.set.get(name)

    if (variable) return variable
  }

  return null
}

/**
 * A fix that adds `text` as the last property of `object`, on its own line when the object spans
 * lines.
 *
 * @param {import('eslint').Rule.RuleFixer} fixer
 * @param {import('estree').ObjectExpression} object
 * @param {string} text - a property, e.g. `'$other': validate(false)`
 * @param {SourceCode} sourceCode
 */
function addProperty(fixer, object, text, sourceCode) {
  const last = object.properties.at(-1)
  const closing = /** @type {import('eslint').AST.Token} */ (sourceCode.getLastToken(object))

  if (!last) return fixer.insertTextBefore(closing, ` ${text} `)

  const afterLast = /** @type {import('eslint').AST.Token} */ (sourceCode.getTokenAfter(last))
  const hasComma = afterLast.value === ','
  const isMultiline = (last.loc?.end.line ?? 0) < (closing.loc?.start.line ?? 0)
  const indent = /^\s*/.exec(sourceCode.lines[(last.loc?.start.line ?? 1) - 1])?.[0] ?? ''

  if (!isMultiline && hasComma) return fixer.insertTextAfter(afterLast, ` ${text}`)
  if (!isMultiline) return fixer.insertTextAfter(last, `, ${text}`)

  return hasComma
    ? fixer.insertTextAfter(afterLast, `\n${indent}${text},`)
    : fixer.insertTextAfter(last, `,\n${indent}${text}`)
}

/**
 * The top-level `||` branches of a folded rule, as text.
 *
 * @param {unknown} value - a folded rule value
 */
function disjunctsIn(value) {
  if (value === true) return ['true']
  if (typeof value !== 'string') return []

  return disjunctsOf(value)
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

/**
 * A branch that lets a client in without naming it: `true`, or a signed-in check (`auth != null`,
 * `auth.uid != null`) that doesn't compare `auth.uid` or read a token claim.
 *
 * @param {string} disjunct
 */
function letsClientIn(disjunct) {
  return disjunct === 'true' ||
    (signedInCheck.test(disjunct) && !namedClientCheck.test(disjunct))
}

/**
 * A disjunct that grants every request: `true`, or `auth != null` (`auth.uid != null`) and nothing
 * else.
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
  return access === 'anyone' ? 'anyone' : 'any signed-in user'
}

/**
 * An ESLint visitor that calls `visit` with every key in a rules file that holds an object of
 * rules, with its path and the service it sits under. A file without `.read` or `.write` is
 * skipped.
 *
 * @param {import('eslint').Rule.RuleContext} context
 * @param {(key: RulesKey) => void} visit
 * @returns {import('eslint').Rule.RuleListener}
 */
function forEachRulesKey(context, visit) {
  const { sourceCode } = context

  if (!accessKey.test(sourceCode.text)) return {}

  return {
    Property(node) {
      const name = keyOf(node, sourceCode)

      if (!name || !isDataKey(name) || node.value.type !== 'ObjectExpression') return

      const path = [...pathOf(node, sourceCode), name]

      visit({ node, name, path, location: path.join('/'), service: serviceOf(path, sourceCode) })
    },
  }
}

/**
 * The trust words in a name, split on camelCase and non-alphanumerics.
 *
 * @example
 * trustClaimsOf('verified-queue', trustWords) // ['verified']
 * trustClaimsOf('isEmployee', trustWords)     // ['employee']
 *
 * @param {string} name - a path segment or field key
 * @param {string[]} words - lowercase trust words
 */
function trustClaimsOf(name, words) {
  return name
    .replace(camelCaseBoundary, '$1 $2')
    .toLowerCase()
    .split(nonAlphanumerics)
    .filter(word => words.includes(word))
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
 *   node: Property,
 *   name: string,
 *   path: string[],
 *   location: string,
 *   service: Service | null,
 * }} RulesKey
 */
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
 *   validatesFields: boolean,
 *   wildcards: Field[],
 *   validate: Field | null,
 *   openToClients: boolean,
 *   level: 'record' | 'data' | null,
 *   service: Service | null,
 * }} Shape
 *   `at` is the key that holds the shape, or the object itself, to report at; `fields` are its
 *   data keys, `validatesFields` whether one of them has a `.validate` (else the shape is only
 *   visited for its `$other`), `wildcards` its `$` keys, `validate` its own `.validate`;
 *   `openToClients` whether a `.write` on it or above it lets some client in; `level` whether it's
 *   a record (the first `$` wildcard) or data inside one
 */
/**
 * @typedef {{
 *   name: string,
 *   check: { identifier: string, rule: string } | null,
 * }} Service
 *   `check` is the `const` named after the service, `isJobAlertSubscriptionService` for
 *   `auth.uid === 'job-alert-subscription-service'`
 */
