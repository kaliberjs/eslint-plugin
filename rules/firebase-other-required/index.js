const docsUrl = require('../../machinery/docsUrl')
const {
  forEachShape, isValidation, ruleText, addProperty,
} = require('../../machinery/firebase-rules')
const { staticValue } = require('../../machinery/static-value')

// Validating a node's fields doesn't stop a client from writing other keys beside them. A `$`
// wildcard with a `.validate`, `$other` by convention, covers every key that isn't listed
// (https://firebase.google.com/docs/database/security/rules-conditions). Inside
// `services/<name>`, the task record's `$other` lets that service write its own keys (the queue's
// `_state`), and an `$other` inside the data a client writes lets nobody.

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description: 'Require a `$other` rule with `.validate` beside validated Firebase fields a ' +
        'client can write, closed to the owning service or to everyone (CWE-915)',
      url: docsUrl(__dirname),
    },
    messages: {
      otherRequired: '`{{path}}`: users can add keys you didn\'t list. Add ' +
        '`\'$other\': {{closing}}`.',
      otherService: '`{{path}}`: only {{service}} should add unlisted keys to this record. Use ' +
        '`{{expected}}`.',
      otherClosed: '`{{path}}`: users write this data, so nobody should add unlisted keys. Use ' +
        '`{{expected}}`.',
    },
    schema: [],
  },

  create(context) {
    const { sourceCode } = context

    return forEachShape(context, shape => {
      const { node, at, location, wildcards, validatesFields, openToClients } = shape
      const { level, service } = shape
      const expected = expectedClosing(level, service)
      const closing = expected && ruleText(expected, node, sourceCode)
      const other = wildcards.find(wildcard => wildcard.name === '$other')

      if (!wildcards.some(wildcard => limitsKeys(wildcard, sourceCode))) {
        if (!validatesFields || !openToClients) return

        context.report({
          node: at,
          messageId: 'otherRequired',
          data: { path: location, closing: closing ?? 'validate(<the service that writes it>)' },
          fix: closing ? fixer => closeOtherKeys(fixer, node, other, closing, sourceCode) : null,
        })
        return
      }

      if (!other || !service || !level || !closing) return

      const { value, unresolved } = staticValue(other.node.value, sourceCode)

      if (unresolved || closesWith(value, level, service)) return

      context.report({
        node: other.node,
        messageId: level === 'record' ? 'otherService' : 'otherClosed',
        data: { path: location, service: service.name, expected: closing },
        fix: fixer => fixer.replaceText(other.node.value, closing),
      })
    })
  },
}

/**
 * Gives an empty `$other` its closing rule, or adds one.
 *
 * @param {import('eslint').Rule.RuleFixer} fixer
 * @param {import('estree').ObjectExpression} node - the shape
 * @param {import('../../machinery/firebase-rules').Field | undefined} other
 * @param {string} closing - e.g. `validate(false)`
 * @param {import('eslint').SourceCode} sourceCode
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
 * @param {import('../../machinery/firebase-rules').Field} wildcard
 * @param {import('eslint').SourceCode} sourceCode
 */
function limitsKeys(wildcard, sourceCode) {
  const { value, unresolved } = staticValue(wildcard.node.value, sourceCode)

  return unresolved || isValidation(value)
}

/** @typedef {import('../../machinery/firebase-rules').Service} Service */
