const docsUrl = require('../../machinery/docsUrl')
const { staticValue } = require('../../machinery/static-value')
const { keyOf, pathOf, clientDisjunctsOf } = require('../../machinery/firebase-rules')

// A `.write` grants deletes too: a delete is a write of null, and `.validate`
// does not run on it. A disjunct that lets any client in without requiring
// `newData.exists()` (something is written) or `!data.exists()` (nothing was
// there) lets that client remove the node and everything under it.

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow a Firebase `.write` that lets any client, or any signed-in client, delete or overwrite a node (CWE-284, OWASP A01:2025)',
      url: docsUrl(__dirname),
    },
    messages: {
      deletable: '`.write` at {{path}} lets {{who}} delete or overwrite this node and everything under it: {{value}}',
    },
    schema: [
      {
        type: 'object',
        properties: {
          env: { type: 'object', additionalProperties: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const { env = {} } = context.options[0] ?? {}
    const { sourceCode } = context

    return {
      Property(node) {
        if (keyOf(node, sourceCode) !== '.write') return

        const write = staticValue(node.value, sourceCode, env)
        const deleting = clientDisjunctsOf(write.value).filter(disjunct => !excludesDelete(disjunct))

        if (!deleting.length) return

        const who = deleting.includes('true') ? 'anyone' : 'any signed-in client'

        context.report({ node, messageId: 'deletable', data: { path: pathOf(node, sourceCode).join('/'), who, value: String(write.value) } })
      },
    }
  },
}

function excludesDelete(disjunct) {
  return /(?<!!\s*)newData\.exists\(\)/.test(disjunct) || /!\s*data\.exists\(\)/.test(disjunct)
}
