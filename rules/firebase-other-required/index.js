const docsUrl = require('../../machinery/docsUrl')
const { forEachShape, optionsSchema, isValidation } = require('../../machinery/firebase-rules')

// Validating a node's fields doesn't stop a client from writing other keys beside them. A `$`
// wildcard with a `.validate`, `$other` by convention, covers every key that isn't listed
// (https://firebase.google.com/docs/database/security/rules-conditions). Only nodes a client can
// write are checked; what a service writes is the project's own code.

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require a `$other` rule with `.validate` beside validated Firebase fields a ' +
        'client can write, so no other keys can be written (CWE-915)',
      url: docsUrl(__dirname),
    },
    messages: {
      otherRequired: 'The fields at {{path}} are validated, but nothing limits other keys: add ' +
        "`'$other': { '.validate': false }`.",
    },
    schema: optionsSchema(),
  },

  create(context) {
    return forEachShape(context, ({ at, location, wildcards, openToClients, fold }) => {
      if (!openToClients) return
      if (wildcards.some(wildcard => limitsKeys(fold(wildcard.node.value)))) return

      context.report({ node: at, messageId: 'otherRequired', data: { path: location } })
    })
  },
}

/**
 * Whether a wildcard's folded rule validates the keys it captures. A rule that doesn't fold gets
 * the benefit of the doubt.
 *
 * @param {import('../../machinery/firebase-rules').Folded} folded
 */
function limitsKeys(folded) {
  return folded.unresolved || isValidation(folded.value)
}
