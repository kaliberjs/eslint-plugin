const docsUrl = require('../../machinery/docsUrl')
const { staticValue } = require('../../machinery/static-value')
const { keyOf, pathOf, clientDisjunctsOf, audienceOf } = require('../../machinery/firebase-rules')

const writesSomething = /(?<!!\s*)newData\.exists\(\)/
const writesOnlyWhereEmpty = /!\s*data\.exists\(\)/

// A `.write` grants deletes too: a delete is a write of null, and `.validate`
// does not run on it. A disjunct that lets any client in without requiring
// `newData.exists()` (something is written) or `!data.exists()` (nothing was
// there) lets that client remove the node and everything under it.

/** @type {import('eslint').Rule.RuleModule} */
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
        const deletingDisjuncts = clientDisjunctsOf(write.value).filter(canDelete)

        if (deletingDisjuncts.length === 0) return

        const access = deletingDisjuncts.includes('true') ? 'anyone' : 'signed-in'

        context.report({
          node,
          messageId: 'deletable',
          data: { path: pathOf(node, sourceCode).join('/'), who: audienceOf(access), value: String(write.value) },
        })
      },
    }
  },
}

/**
 * @param {string} disjunct - one `||` branch of a folded `.write`
 * @returns {boolean} whether the branch requires neither something written
 *   (`newData.exists()`) nor nothing there (`!data.exists()`)
 */
function canDelete(disjunct) {
  return !writesSomething.test(disjunct) && !writesOnlyWhereEmpty.test(disjunct)
}
