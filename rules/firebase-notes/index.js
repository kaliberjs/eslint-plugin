const docsUrl = require('../../machinery/docsUrl')
const { forEachRulesKey, trustWords, trustClaimsOf } = require('../../machinery/firebase-rules')

// Notes, not problems: they mark the keys that change how the other Firebase rules treat
// everything below them, so the reason is visible where the rules apply. Meant to show as `info`
// in the editor (see the readme).

const writeKey = /['"]\.write['"]/
const recordKey = /['"]?\$\w+['"]?\s*:/

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Mark Firebase keys that change how the other Firebase rules treat what\'s ' +
        'below them: trust words and service nodes',
      url: docsUrl(__dirname),
    },
    messages: {
      trusted: '`{{name}}` reads as trusted ({{words}}): a signed-in user writing below it is ' +
        'reported.',
      serviceOwned: '`{{name}}` belongs to `{{check}}`: records below may get unlisted keys only ' +
        'from it, their data from nobody.',
    },
    schema: [{
      type: 'object',
      properties: {
        words: { type: 'array', items: { type: 'string' }, minItems: 1, uniqueItems: true },
      },
      additionalProperties: false,
    }],
  },

  create(context) {
    const { sourceCode } = context
    const { words = trustWords } = context.options[0] ?? {}

    return forEachRulesKey(context, ({ node, name, path, service }) => {
      const claims = trustClaimsOf(name, words)

      if (claims.length && writeKey.test(sourceCode.getText(node.value))) {
        const data = { name, words: claims.join(', ') }

        context.report({ node: node.key, messageId: 'trusted', data })
      }

      const holdsRecords = recordKey.test(sourceCode.getText(node.value))

      if (service?.check && isServiceNode(path, service.name) && holdsRecords) {
        const data = { name, check: service.check.identifier }

        context.report({ node: node.key, messageId: 'serviceOwned', data })
      }
    })
  },
}

/**
 * Whether the key is the service node itself, `services/<name>`.
 *
 * @param {string[]} path - the key's path, itself included
 * @param {string} name - the service name
 */
function isServiceNode(path, name) {
  return path.at(-2) === 'services' && path.at(-1) === name
}
