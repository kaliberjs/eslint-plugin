const docsUrl = require('../../machinery/docsUrl')
const { staticValue } = require('../../machinery/static-value')
const { keyOf, pathOf, fieldsOf, accessOf } = require('../../machinery/firebase-rules')

// A Firebase Realtime Database rules file, written as JavaScript that builds
// the rules object. A `.write` that any signed-in client passes lets that
// client create the node itself; when the node's path or its sibling fields
// claim trust (`verified-queue`, `isAdmin`), a worker that reads it may act on
// a claim nobody checked. Single-file and lenient: a value that does not fold
// to a constant is skipped, or reported as `unresolved` when asked.

const trustWords = ['verified', 'approved', 'trusted', 'admin', 'confirmed', 'paid', 'validated', 'internal', 'system', 'employee']

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

        if (write.unresolved) {
          if (reportUnresolved) context.report({ node, messageId: 'unresolved', data: { reason: write.unresolved } })
          return
        }
        if (!accessOf(write.value)) return

        const path = pathOf(node, sourceCode)
        const fields = fieldsOf(node, sourceCode).map(field => keyOf(field, sourceCode)).filter(Boolean)
        const names = [...path, ...fields].filter(name => claimsTrust(name, words))

        if (names.length) context.report({ node, messageId: 'trustPath', data: { path: path.join('/'), names: names.join(', '), value: String(write.value) } })
      },
    }
  },
}

function claimsTrust(name, words) {
  return wordsOf(name).some(word => words.includes(word))
}

function wordsOf(name) {
  return String(name).replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
}
