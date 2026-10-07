const docsUrl = require('../../machinery/docsUrl')
const { staticValue } = require('../../machinery/static-value')
const { keyOf, pathOf, fieldsOf, accessOf } = require('../../machinery/firebase-rules')

// A record any signed-in client can write, with a field that names its owner.
// Unless a rule ties that field to `auth.uid`, the client can write someone
// else's uid into it, and whatever reads the record acts for that user.

const uidField = /^(uid|userUid|userId|ownerUid|ownerId)$/

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow a uid field, beside a Firebase `.write` any signed-in client passes, that is never checked against `auth.uid` (CWE-639, OWASP A01:2025)',
      url: docsUrl(__dirname),
    },
    messages: {
      unboundUid: '`{{field}}` at {{path}} is written by any signed-in client and never checked against `auth.uid`, so a client can write it in another user\'s name.',
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

        if (!accessOf(write.value)) return

        for (const field of fieldsOf(node, sourceCode)) {
          const name = keyOf(field, sourceCode)

          if (!uidField.test(name)) continue

          const validation = staticValue(field.value, sourceCode, env)

          if (validation.unresolved || mentionsAuthUid(validation.value)) continue

          context.report({ node: field, messageId: 'unboundUid', data: { field: name, path: pathOf(node, sourceCode).join('/') } })
        }
      },
    }
  },
}

function mentionsAuthUid(validation) {
  return stringsOf(validation).some(text => text.includes('auth.uid'))
}

function stringsOf(value) {
  if (typeof value === 'string') return [value]
  if (value && typeof value === 'object') return Object.values(value).flatMap(stringsOf)

  return []
}
