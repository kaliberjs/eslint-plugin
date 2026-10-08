const docsUrl = require('../../machinery/docsUrl')
const { forEachShape } = require('../../machinery/firebase-rules')
const { staticValue } = require('../../machinery/static-value')

// Field rules only run on children that exist. A string or number written in place of the object
// has no children, so it passes every field rule. Firebase's own answer is a `.validate` with
// `newData.hasChildren()` on the object
// (https://firebase.google.com/docs/database/security/rules-conditions).

const requiresChildren = /newData\.hasChildren\(/

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require `newData.hasChildren()` on validated Firebase objects a client can ' +
        'write, so a primitive written in their place doesn\'t skip every field rule (CWE-20)',
      url: docsUrl(__dirname),
    },
    messages: {
      childrenRequired: 'The fields at {{path}} are validated, but a string or number written ' +
        'in their place passes: add `\'.validate\': "newData.hasChildren([…])"` with the ' +
        'required fields.',
    },
    schema: [],
  },

  create(context) {
    return forEachShape(context, ({ node, at, location, validate, openToClients }) => {
      if (!openToClients) return
      if (validationsOf(node, validate, context.sourceCode).some(requiresObject)) return

      context.report({ node: at, messageId: 'childrenRequired', data: { path: location } })
    })
  },
}

/**
 * A shape's own `.validate`, folded: its `.validate` key, or one spread in from a helper
 * (`...hasChildren(['email'])`).
 *
 * @param {import('estree').ObjectExpression} node
 * @param {import('../../machinery/firebase-rules').Field | null} validate
 * @param {import('eslint').SourceCode} sourceCode
 */
function validationsOf(node, validate, sourceCode) {
  const spreads = node.properties
    .filter(property => property.type === 'SpreadElement')
    .map(spread => staticValue(spread.argument, sourceCode))
    .map(({ value, unresolved }) => ({ value: Object(value)['.validate'], unresolved }))

  return validate ? [staticValue(validate.node.value, sourceCode), ...spreads] : spreads
}

/**
 * Whether a folded `.validate` requires children. A rule that doesn't fold gets the benefit of the
 * doubt.
 *
 * @param {import('../../machinery/static-value').Folded} validation
 */
function requiresObject({ value, unresolved }) {
  return unresolved || requiresChildren.test(String(value))
}
