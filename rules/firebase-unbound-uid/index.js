const docsUrl = require('../../machinery/docsUrl')
const { forEachAccessRule, ruleText } = require('../../machinery/firebase-rules')
const { staticValue } = require('../../machinery/static-value')

// A record any signed-in client can write, with a field that names its owner. Unless a rule
// ties that field to `auth.uid`, the client can write someone else's uid into it, and whatever
// reads the record acts for that user. Owner fields are named after Firebase's own `auth.uid`:
// `uid`, `userUid`, `ownerUid`.

const uidName = /^uid$|Uid$/
const ownUid = "'newData.val() === auth.uid'"
const bindsToAuthUid = /newData\.val\(\)\s*===?\s*auth\.uid|auth\.uid\s*===?\s*newData\.val\(\)/

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    hasSuggestions: true,
    docs: {
      description: 'Disallow a uid field, beside a Firebase `.write` any signed-in client ' +
        'passes, that is never checked against `auth.uid` (CWE-639, OWASP A01:2025)',
      url: docsUrl(__dirname),
    },
    messages: {
      unboundUid: '`{{field}}` at {{path}} is written by any signed-in client and never checked ' +
        'against `auth.uid`, so a client can write it in another user\'s name.',
      bindToAuthUid: 'Validate `{{field}}` as `newData.val() === auth.uid`.',
    },
    schema: [],
  },

  create(context) {
    return forEachAccessRule(context, ({ key, access, fields, location }) => {
      if (key !== '.write' || !access) return

      for (const field of fields) {
        if (!isOwnerField(field.name)) continue

        const validation = staticValue(field.node.value, context.sourceCode)

        if (validation.unresolved || isBoundToAuthUid(validation.value)) continue

        const value = field.node.value
        const bound = ruleText(ownUid, value, context.sourceCode)

        context.report({
          node: field.node,
          messageId: 'unboundUid',
          data: { field: field.name, path: location },
          suggest: [{
            messageId: 'bindToAuthUid',
            data: { field: field.name },
            fix: fixer => fixer.replaceText(value, bound),
          }],
        })
      }
    })
  },
}

/**
 * @param {string | null} name - a field key
 * @returns {name is string} whether the field names the user a record belongs to
 */
function isOwnerField(name) {
  return name !== null && uidName.test(name)
}

/** @param {unknown} validation - a folded field rule, often `{ '.validate': '…' }` */
function isBoundToAuthUid(validation) {
  return bindsToAuthUid.test(JSON.stringify(validation))
}
