const docsUrl = require('../../machinery/docsUrl')
const { forEachAccessRule } = require('../../machinery/firebase-rules')

// A `.write` that any signed-in client passes lets that client create the node itself. When the
// node's path or its sibling fields claim trust (`verified-queue`, `isEmployee`), a worker that
// reads it may act on a claim nobody checked. The default words are the ones Kaliber's rules files
// actually use for such claims; a project replaces them with `words`.

const trustWords = ['verified', 'employee']
const camelCaseBoundary = /([a-z0-9])([A-Z])/g
const nonAlphanumerics = /[^a-z0-9]+/

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
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
    },
    schema: [{
      type: 'object',
      properties: {
        words: { type: 'array', items: { type: 'string' }, minItems: 1, uniqueItems: true },
      },
      additionalProperties: false,
    }],
  },

  create(context) {
    const { words = trustWords } = context.options[0] ?? {}

    return forEachAccessRule(context, rule => {
      const { node, key, value, access, path, fields, location } = rule

      if (key !== '.write' || !access) return

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
 * Whether one of the name's words is a trust word.
 *
 * @param {string} name - a path segment or field key
 * @param {string[]} words - lowercase trust words
 */
function claimsTrust(name, words) {
  return wordsOf(name).some(word => words.includes(word))
}

/**
 * The name's lowercase words, split on camelCase and non-alphanumerics.
 *
 * @example
 * wordsOf('isEmployee')     // ['is', 'employee']
 * wordsOf('verified-queue') // ['verified', 'queue']
 *
 * @param {string} name
 */
function wordsOf(name) {
  return name
    .replace(camelCaseBoundary, '$1 $2')
    .toLowerCase()
    .split(nonAlphanumerics)
    .filter(Boolean)
}
