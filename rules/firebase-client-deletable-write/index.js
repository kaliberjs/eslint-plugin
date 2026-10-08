const docsUrl = require('../../machinery/docsUrl')
const {
  forEachAccessRule, optionsSchema, clientDisjunctsOf, audienceOf,
} = require('../../machinery/firebase-rules')

// A delete is a write of null, and `.validate` does not run on it. A disjunct that lets any
// client in without requiring `newData.exists()` (something is written) or `!data.exists()`
// (nothing was there) lets that client remove the node and everything under it.

const writesSomething = /(?<!!\s*)newData\.exists\(\)/
const writesOnlyWhereEmpty = /!\s*data\.exists\(\)/

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow a Firebase `.write` that lets any client, or any signed-in client, ' +
        'delete or overwrite a node (CWE-284, OWASP A01:2025)',
      url: docsUrl(__dirname),
    },
    messages: {
      deletable: '`.write` at {{path}} lets {{who}} delete or overwrite this node and ' +
        'everything under it: {{value}}',
    },
    schema: optionsSchema(),
  },

  create(context) {
    return forEachAccessRule(context, ({ node, key, value, location }) => {
      if (key !== '.write') return

      const deletingDisjuncts = clientDisjunctsOf(value).filter(canDelete)

      if (deletingDisjuncts.length === 0) return

      const access = deletingDisjuncts.includes('true') ? 'anyone' : 'signed-in'

      context.report({
        node,
        messageId: 'deletable',
        data: { path: location, who: audienceOf(access), value: String(value) },
      })
    })
  },
}

/**
 * Whether the branch requires neither something written (`newData.exists()`) nor nothing there
 * (`!data.exists()`).
 *
 * @param {string} disjunct - one `||` branch of a folded `.write`
 */
function canDelete(disjunct) {
  return !writesSomething.test(disjunct) && !writesOnlyWhereEmpty.test(disjunct)
}
