const docsUrl = require('../../machinery/docsUrl')
const { forEachAccessRule, audienceOf } = require('../../machinery/firebase-rules')

// A `.write` that lets a client in without naming it (`auth != null`, `true`) must be create-only:
// `newData.exists() && !data.exists()`. Without both, that client can change what others wrote,
// or delete it with a write of null, which `.validate` doesn't run on.

const writesSomething = /(?<!!\s*)newData\.exists\(\)/
const writesOnlyWhereEmpty = /!\s*data\.exists\(\)/
const createOnly = 'newData.exists() && !data.exists()'

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    hasSuggestions: true,
    docs: {
      description: 'Require a Firebase `.write` that lets any signed-in user in to be ' +
        'create-only, `newData.exists() && !data.exists()` (CWE-284, OWASP A01:2025)',
      url: docsUrl(__dirname),
    },
    messages: {
      notCreateOnly: '`{{path}}`: {{who}} can change or delete what\'s here (`{{value}}`). A ' +
        'write for users must be create-only: `newData.exists() && !data.exists()`.',
      createOnly: 'Make it create-only.',
    },
    schema: [],
  },

  create(context) {
    return forEachAccessRule(context, ({ node, key, value, location, clientDisjuncts }) => {
      if (key !== '.write') return

      const openDisjuncts = clientDisjuncts.filter(disjunct => !isCreateOnly(disjunct))

      if (openDisjuncts.length === 0) return

      const access = openDisjuncts.includes('true') ? 'anyone' : 'signed-in'
      const createOnlyWrite = createOnlyText(node.value, context.sourceCode)

      context.report({
        node,
        messageId: 'notCreateOnly',
        data: { path: location, who: audienceOf(access), value: String(value) },
        suggest: [{
          messageId: 'createOnly',
          fix: fixer => fixer.replaceText(node.value, createOnlyWrite),
        }],
      })
    })
  },
}

/**
 * Whether the branch requires something written (`newData.exists()`) where nothing was
 * (`!data.exists()`).
 *
 * @param {string} disjunct - one `||` branch of a folded `.write`
 */
function isCreateOnly(disjunct) {
  return writesSomething.test(disjunct) && writesOnlyWhereEmpty.test(disjunct)
}

/**
 * The `.write` source text made create-only, in the form it was written in.
 *
 * @example
 * // 'auth != null'                 → '(auth != null) && newData.exists() && !data.exists()'
 * // `${isService} || ${hasAuth()}` → `(${isService} || ${hasAuth()}) && newData.exists() …`
 * // hasAuth()                      → `(${hasAuth()}) && newData.exists() && !data.exists()`
 *
 * @param {import('estree').Node} value
 * @param {import('eslint').SourceCode} sourceCode
 */
function createOnlyText(value, sourceCode) {
  const text = sourceCode.getText(value)

  if (value.type === 'Literal' && value.value === true) return `'${createOnly}'`
  if (value.type === 'Literal' || value.type === 'TemplateLiteral') {
    const quote = text[0]

    return `${quote}(${text.slice(1, -1)}) && ${createOnly}${quote}`
  }

  return `\`(\${${text}}) && ${createOnly}\``
}
