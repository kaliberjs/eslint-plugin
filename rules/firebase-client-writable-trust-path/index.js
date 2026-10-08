const docsUrl = require('../../machinery/docsUrl')
const {
  forEachAccessRule, optionsSchema, isOpenToClients,
} = require('../../machinery/firebase-rules')

// A `.write` that any signed-in client passes lets that client create the node itself. When the
// node's path or its sibling fields claim trust (`verified-queue`, `isAdmin`), a worker that
// reads it may act on a claim nobody checked.

const trustWords = [
  'verified', 'approved', 'trusted', 'admin', 'confirmed',
  'paid', 'validated', 'internal', 'system', 'employee',
]

const camelCaseBoundary = /([a-z0-9])([A-Z])/g
const nonAlphanumerics = /[^a-z0-9]+/

/** @type {import('eslint').Rule.RuleModule & { trustWords: string[] }} */
module.exports = {
  trustWords,
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow a Firebase `.write` that any signed-in client passes, under a path ' +
        'or beside a field whose name claims trust (CWE-863, OWASP A01:2025)',
      url: docsUrl(__dirname),
    },
    messages: {
      trustPath: '`.write` at {{path}} lets any signed-in client create data under a ' +
        'trust-claiming name ({{names}}): {{value}}',
      unresolved: '`.write` not resolved: {{reason}}',
    },
    schema: optionsSchema({
      words: { type: 'array', items: { type: 'string' }, uniqueItems: true },
      reportUnresolved: { type: 'boolean' },
    }),
  },

  create(context) {
    const { words = trustWords, reportUnresolved = false } = context.options[0] ?? {}

    return forEachAccessRule(context, rule => {
      const { node, key, value, unresolved, path, fields, location } = rule

      if (key !== '.write') return
      if (unresolved && reportUnresolved) {
        context.report({ node, messageId: 'unresolved', data: { reason: unresolved } })
      }
      if (unresolved || !isOpenToClients(value)) return

      const names = [...path, ...fields.map(field => field.name)]
      const trustClaimingNames = names.filter(name => name !== null && claimsTrust(name, words))

      if (trustClaimingNames.length === 0) return

      context.report({
        node,
        messageId: 'trustPath',
        data: { path: location, names: trustClaimingNames.join(', '), value: String(value) },
      })
    })
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
  return name
    .replace(camelCaseBoundary, '$1 $2')
    .toLowerCase()
    .split(nonAlphanumerics)
    .filter(Boolean)
}
