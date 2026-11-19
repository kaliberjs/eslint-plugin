const { isValidation, ruleText, addProperty } = require('./firebase-rules')
const { staticValue } = require('./static-value')

// The checks on a shape's structure, shared by the rule for data users write (an error) and the
// one for data only our own code writes (best practice, a warning). Each returns a report without
// its message text, so each rule words it for its own case.

module.exports = { otherFindingOf, childrenFindingOf }

const requiresChildren = /newData\.hasChildren\(/
const requireObject = `'.validate': 'newData.hasChildren()'`

/**
 * What's wrong with a shape's `$other`: missing (`otherRequired`), or, inside `services/<name>`,
 * open to the wrong writer (`otherService` on a record, `otherClosed` on data).
 *
 * @param {Shape} shape
 * @param {SourceCode} sourceCode
 * @returns {Finding | null}
 */
function otherFindingOf(shape, sourceCode) {
  const { node, at, location, wildcards, validatesFields, level, service } = shape
  const expected = expectedClosing(level, service)
  const closing = expected && ruleText(expected, node, sourceCode)
  const other = wildcards.find(wildcard => wildcard.name === '$other')

  if (!wildcards.some(wildcard => limitsKeys(wildcard, sourceCode))) {
    if (!validatesFields) return null

    return {
      node: at,
      messageId: 'otherRequired',
      data: { path: location, closing: closing ?? 'validate(<the service that writes it>)' },
      fix: closing ? fixer => closeOtherKeys(fixer, node, other, closing, sourceCode) : null,
    }
  }

  if (!other || !service || !level || !closing) return null

  const { value, unresolved } = staticValue(other.node.value, sourceCode)

  if (unresolved || closesWith(value, level, service)) return null

  return {
    node: other.node,
    messageId: level === 'record' ? 'otherService' : 'otherClosed',
    data: { path: location, service: service.name, expected: closing },
    fix: fixer => fixer.replaceText(other.node.value, closing),
  }
}

/**
 * A shape with validated fields but no `newData.hasChildren()` in its own `.validate`
 * (`childrenRequired`); fixable when it has no `.validate` at all.
 *
 * @param {Shape} shape
 * @param {SourceCode} sourceCode
 * @returns {Finding | null}
 */
function childrenFindingOf(shape, sourceCode) {
  const { node, at, location, validate, validatesFields } = shape
  const validations = validationsOf(node, validate, sourceCode)

  if (!validatesFields || validations.some(requiresObject)) return null

  return {
    node: at,
    messageId: 'childrenRequired',
    data: { path: location },
    fix: validations.some(isPresent)
      ? null
      : fixer => addProperty(fixer, node, requireObject, sourceCode),
  }
}

/**
 * Gives an empty `$other` its closing rule, or adds one.
 *
 * @param {import('eslint').Rule.RuleFixer} fixer
 * @param {import('estree').ObjectExpression} node - the shape
 * @param {Field | undefined} other
 * @param {string} closing - e.g. `validate(false)`
 * @param {SourceCode} sourceCode
 */
function closeOtherKeys(fixer, node, other, closing, sourceCode) {
  if (other) return fixer.replaceText(other.node.value, closing)

  return addProperty(fixer, node, `'$other': ${closing}`, sourceCode)
}

/**
 * What `$other` should validate with: `false` inside the data a record holds, the service's own
 * check on its task record. `null` when that can't be told: a record outside `services`, or one
 * whose service has no named check, may get keys from a worker (a queue's `_state`).
 *
 * @param {'record' | 'data' | null} level
 * @param {Service | null} service
 */
function expectedClosing(level, service) {
  if (level === 'data') return 'false'
  if (level === 'record') return service?.check?.identifier ?? null

  return null
}

/**
 * Whether a folded `$other` rule closes the way its place in the service asks.
 *
 * @param {unknown} value
 * @param {'record' | 'data'} level
 * @param {Service} service
 */
function closesWith(value, level, service) {
  const validate = isValidation(value) ? Object(value)['.validate'] : undefined

  if (level === 'data') return validate === false || validate === 'false'

  return typeof validate === 'string' && sameRule(validate, String(service.check?.rule))
}

/**
 * @param {string} a
 * @param {string} b
 */
function sameRule(a, b) {
  return a.replace(/^\((.*)\)$/, '$1').trim() === b.replace(/^\((.*)\)$/, '$1').trim()
}

/**
 * Whether a wildcard's folded rule validates the keys it captures. A rule that doesn't fold gets
 * the benefit of the doubt.
 *
 * @param {Field} wildcard
 * @param {SourceCode} sourceCode
 */
function limitsKeys(wildcard, sourceCode) {
  const { value, unresolved } = staticValue(wildcard.node.value, sourceCode)

  return unresolved || isValidation(value)
}

/**
 * A shape's own `.validate`, folded: its `.validate` key, or one spread in from a helper
 * (`...hasChildren(['email'])`).
 *
 * @param {import('estree').ObjectExpression} node
 * @param {Field | null} validate
 * @param {SourceCode} sourceCode
 */
function validationsOf(node, validate, sourceCode) {
  const spreads = node.properties
    .filter(property => property.type === 'SpreadElement')
    .map(spread => staticValue(spread.argument, sourceCode))
    .map(({ value, unresolved }) => ({ value: Object(value)['.validate'], unresolved }))

  return validate ? [staticValue(validate.node.value, sourceCode), ...spreads] : spreads
}

/**
 * Whether there is a `.validate` at all: one that folds, or one that doesn't.
 *
 * @param {Folded} validation
 */
function isPresent({ value, unresolved }) {
  return unresolved || value !== undefined
}

/**
 * Whether a folded `.validate` requires children. A rule that doesn't fold gets the benefit of the
 * doubt.
 *
 * @param {Folded} validation
 */
function requiresObject({ value, unresolved }) {
  return unresolved || requiresChildren.test(String(value))
}

/** @typedef {import('eslint').SourceCode} SourceCode */
/** @typedef {import('./static-value').Folded} Folded */
/** @typedef {import('./firebase-rules').Field} Field */
/** @typedef {import('./firebase-rules').Shape} Shape */
/** @typedef {import('./firebase-rules').Service} Service */
/**
 * A report without its message text.
 *
 * @typedef {{
 *   node: import('estree').Node,
 *   messageId: 'otherRequired' | 'otherService' | 'otherClosed' | 'childrenRequired',
 *   data: Record<string, string>,
 *   fix: import('eslint').Rule.ReportFixer | null,
 * }} Finding
 */
