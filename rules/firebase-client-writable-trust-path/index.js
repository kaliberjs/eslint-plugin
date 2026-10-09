const docsUrl = require('../../machinery/docsUrl')
const { forEachAccessRule, trustWords, trustClaimsOf } = require('../../machinery/firebase-rules')

// A `.write` that any signed-in client passes lets that client create the node itself. When the
// node's path or its sibling fields claim trust (`verified-queue`, `isEmployee`), a worker that
// reads it may act on a claim nobody checked. A project replaces the default words with `words`.

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
      trustPath: '`{{path}}` looks trusted ({{names}}), but any signed-in user can create it ' +
        '(`{{value}}`). Let only the server or a service write here.',
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
      const trustClaimingNames = names
        .filter(name => name !== null)
        .filter(name => trustClaimsOf(name, words).length > 0)

      if (trustClaimingNames.length === 0) return

      context.report({
        node,
        messageId: 'trustPath',
        data: { path: location, names: trustClaimingNames.join(', '), value: String(value) },
      })
    })
  },
}
