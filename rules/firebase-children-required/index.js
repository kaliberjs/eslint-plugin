const docsUrl = require('../../machinery/docsUrl')
const { forEachShape } = require('../../machinery/firebase-rules')
const { childrenFindingOf } = require('../../machinery/firebase-shapes')

// Field rules only run on children that exist. A string or number written in place of the object
// has no children, so it passes every field rule. Firebase's own answer is a `.validate` with
// `newData.hasChildren()` on the object
// (https://firebase.google.com/docs/database/security/rules-conditions).

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description: 'Require `newData.hasChildren()` on validated Firebase objects a client can ' +
        'write, so a primitive written in their place doesn\'t skip every field rule (CWE-20)',
      url: docsUrl(__dirname),
    },
    messages: {
      childrenRequired: '`{{path}}`: a plain string or number written here skips every field ' +
        'rule. Add `\'.validate\': \'newData.hasChildren()\'`.',
    },
    schema: [],
  },

  create(context) {
    return forEachShape(context, shape => {
      if (!shape.openToClients) return

      const finding = childrenFindingOf(shape, context.sourceCode)

      if (finding) context.report(finding)
    })
  },
}
