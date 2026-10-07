const docsUrl = require('../../machinery/docsUrl')
const { staticValue } = require('../../machinery/static-value')
const { keyOf, pathOf, fieldsOf, isOpenToClients } = require('../../machinery/firebase-rules')

// A Firebase Realtime Database rules file, written as JavaScript that builds
// the rules object. A `.write` that any signed-in client passes lets that
// client create the node itself; when the node's path or its sibling fields
// claim trust (`verified-queue`, `isAdmin`), a worker that reads it may act on
// a claim nobody checked. Single-file and lenient: a value that does not fold
// to a constant is skipped, or reported as `unresolved` when asked.

const camelCaseBoundary = /([a-z0-9])([A-Z])/g
const nonAlphanumerics = /[^a-z0-9]+/

const trustWords = ['verified', 'approved', 'trusted', 'admin', 'confirmed', 'paid', 'validated', 'internal', 'system', 'employee']

/** @type {import('eslint').Rule.RuleModule & { trustWords: string[] }} */
module.exports = {
  trustWords,
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow a Firebase `.write` that any signed-in client passes, under a path or beside a field whose name claims trust (CWE-863, OWASP A01:2025)',
      url: docsUrl(__dirname),
    },
    messages: {
      trustPath: '`.write` at {{path}} lets any signed-in client create data under a trust-claiming name ({{names}}): {{value}}',
      unresolved: '`.write` not resolved: {{reason}}',
    },
    schema: [
      {
        type: 'object',
        properties: {
          env: { type: 'object', additionalProperties: { type: 'string' } },
          words: { type: 'array', items: { type: 'string' }, uniqueItems: true },
          reportUnresolved: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const { env = {}, words = trustWords, reportUnresolved = false } = context.options[0] ?? {}
    const { sourceCode } = context

    return {
      Property(node) {
        if (keyOf(node, sourceCode) !== '.write') return

        const write = staticValue(node.value, sourceCode, env)

        if (write.unresolved && reportUnresolved) context.report({ node, messageId: 'unresolved', data: { reason: write.unresolved } })
        if (write.unresolved || !isOpenToClients(write.value)) return

        const path = pathOf(node, sourceCode)
        const fieldNames = fieldsOf(node, sourceCode).map(field => keyOf(field, sourceCode)).filter(name => name !== null)
        const trustClaimingNames = [...path, ...fieldNames].filter(name => claimsTrust(name, words))

        if (trustClaimingNames.length === 0) return

        context.report({
          node,
          messageId: 'trustPath',
          data: { path: path.join('/'), names: trustClaimingNames.join(', '), value: String(write.value) },
        })
      },
    }
  },
}

/**
 * @param {string} name - a path segment or field key
 * @param {string[]} words - lowercase trust words
 * @returns {boolean} whether one of the name's words is a trust word
 */
function claimsTrust(name, words) {
  return wordsOf(name).some(word => words.includes(word))
}

/**
 * @example
 * wordsOf('isEmployee')     // ['is', 'employee']
 * wordsOf('verified-queue') // ['verified', 'queue']
 *
 * @param {string} name
 * @returns {string[]} the name's lowercase words, split on camelCase and non-alphanumerics
 */
function wordsOf(name) {
  return name.replace(camelCaseBoundary, '$1 $2').toLowerCase().split(nonAlphanumerics).filter(Boolean)
}
