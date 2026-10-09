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
    hasSuggestions: true,
    docs: {
      description: 'Disallow a Firebase `.write` that lets any client, or any signed-in client, ' +
        'delete or overwrite a node (CWE-284, OWASP A01:2025)',
      url: docsUrl(__dirname),
    },
    messages: {
      deletable: '`{{path}}`: {{who}} can delete or overwrite this (`{{value}}`). Allow creates ' +
        'only with `!data.exists()`, or limit it to a user or service.',
      createOnly: 'Allow creates only: add `!data.exists()`.',
    },
    schema: [],
  },

  create(context) {
    return forEachAccessRule(context, ({ node, key, value, location, clientDisjuncts }) => {
      if (key !== '.write') return

      const deletingDisjuncts = clientDisjuncts.filter(canReplaceExisting)

      if (deletingDisjuncts.length === 0) return

      const access = deletingDisjuncts.includes('true') ? 'anyone' : 'signed-in'

      const createOnly = createOnlyText(node.value, context.sourceCode)

      context.report({
        node,
        messageId: 'deletable',
        data: { path: location, who: audienceOf(access), value: String(value) },
        suggest: [{
          messageId: 'createOnly',
          fix: fixer => fixer.replaceText(node.value, createOnly),
        }],
      })
    })
  },
}

/**
 * The `.write` source text with `!data.exists()` required on top, in the form it was written in.
 *
 * @example
 * // 'auth != null'                  → '(auth != null) && !data.exists()'
 * // `${isService} || ${hasAuth()}`  → `(${isService} || ${hasAuth()}) && !data.exists()`
 * // hasAuth()                       → `(${hasAuth()}) && !data.exists()`
 *
 * @param {import('estree').Node} value
 * @param {import('eslint').SourceCode} sourceCode
 */
function createOnlyText(value, sourceCode) {
  const text = sourceCode.getText(value)

  if (value.type === 'Literal' && value.value === true) return "'!data.exists()'"
  if (value.type === 'Literal' || value.type === 'TemplateLiteral') {
    const quote = text[0]

    return `${quote}(${text.slice(1, -1)}) && !data.exists()${quote}`
  }

  return `\`(\${${text}}) && !data.exists()\``
}

/**
 * Whether the branch doesn't require nothing there (`!data.exists()`).
 *
 * @param {string} disjunct - one `||` branch of a folded `.write`
 */
function canReplaceExisting(disjunct) {
  return !writesOnlyWhereEmpty.test(disjunct)
}
