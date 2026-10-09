const docsUrl = require('../../machinery/docsUrl')
const { forEachAccessRule, audienceOf } = require('../../machinery/firebase-rules')

// A disjunct that lets any client in without requiring `!data.exists()` (nothing was there) lets
// that client replace what exists: overwrite it, or delete it with a write of null, which
// `.validate` doesn't run on.

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
      deletable: '`{{path}}`: {{who}} can delete or overwrite this (`{{value}}`). Allow creates ' +
        'only with `!data.exists()`, or limit it to a user or service.',
    },
    schema: [],
  },

  create(context) {
    return forEachAccessRule(context, ({ node, key, value, location, clientDisjuncts }) => {
      if (key !== '.write') return

      const deletingDisjuncts = clientDisjuncts.filter(canReplaceExisting)

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
 * Whether the branch doesn't require nothing there (`!data.exists()`).
 *
 * @param {string} disjunct - one `||` branch of a folded `.write`
 */
function canReplaceExisting(disjunct) {
  return !writesOnlyWhereEmpty.test(disjunct)
}
