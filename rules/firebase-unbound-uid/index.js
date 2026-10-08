const docsUrl = require('../../machinery/docsUrl')
const {
  forEachAccessRule, optionsSchema, isOpenToClients,
} = require('../../machinery/firebase-rules')

// A record any signed-in client can write, with a field that names its owner. Unless a rule
// ties that field to `auth.uid`, the client can write someone else's uid into it, and whatever
// reads the record acts for that user.

const ownerFieldNames = ['uid', 'userUid', 'userId', 'ownerUid', 'ownerId']

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow a uid field, beside a Firebase `.write` any signed-in client ' +
        'passes, that is never checked against `auth.uid` (CWE-639, OWASP A01:2025)',
      url: docsUrl(__dirname),
    },
    messages: {
      unboundUid: '`{{field}}` at {{path}} is written by any signed-in client and never checked ' +
        'against `auth.uid`, so a client can write it in another user\'s name.',
    },
    schema: optionsSchema(),
  },

  create(context) {
    return forEachAccessRule(context, ({ key, value, fields, fold, location }) => {
      if (key !== '.write' || !isOpenToClients(value)) return

      for (const field of fields) {
        if (!isOwnerField(field.name)) continue

        const validation = fold(field.node.value)

        if (validation.unresolved || checksAuthUid(validation.value)) continue

        context.report({
          node: field.node,
          messageId: 'unboundUid',
          data: { field: field.name, path: location },
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
  return name !== null && ownerFieldNames.includes(name)
}

/**
 * @param {unknown} validation - a folded field rule, often `{ '.validate': '…' }`
 * @returns {boolean}
 */
function checksAuthUid(validation) {
  return stringsOf(validation).some(text => text.includes('auth.uid'))
}

/**
 * @param {unknown} value
 * @returns {string[]} every string in `value`, searched through nested objects
 */
function stringsOf(value) {
  if (typeof value === 'string') return [value]
  if (value && typeof value === 'object') return Object.values(value).flatMap(stringsOf)

  return []
}
