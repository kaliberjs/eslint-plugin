const docsUrl = require('../../machinery/docsUrl')
const { forEachShape } = require('../../machinery/firebase-rules')
const { otherFindingOf } = require('../../machinery/firebase-shapes')

// Validating a node's fields doesn't stop a client from writing other keys beside them. A `$`
// wildcard with a `.validate`, `$other` by convention, covers every key that isn't listed
// (https://firebase.google.com/docs/database/security/rules-conditions). Inside
// `services/<name>`, the task record's `$other` lets that service write its own keys (the queue's
// `_state`), and an `$other` inside the data a client writes lets nobody.

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description: 'Require a `$other` rule with `.validate` beside validated Firebase fields a ' +
        'client can write, closed to the owning service or to everyone (CWE-915)',
      url: docsUrl(__dirname),
    },
    messages: {
      otherRequired: '`{{path}}`: users can add keys you didn\'t list. Add ' +
        '`\'$other\': {{closing}}`.',
      otherService: '`{{path}}`: only {{service}} should add unlisted keys to this record. Use ' +
        '`{{expected}}`.',
      otherClosed: '`{{path}}`: users write this data, so nobody should add unlisted keys. Use ' +
        '`{{expected}}`.',
    },
    schema: [],
  },

  create(context) {
    return forEachShape(context, shape => {
      if (!shape.openToClients) return

      const finding = otherFindingOf(shape, context.sourceCode)

      if (finding) context.report(finding)
    })
  },
}
