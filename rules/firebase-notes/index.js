const docsUrl = require('../../machinery/docsUrl')
const { forEachRulesKey } = require('../../machinery/firebase-rules')

// Notes, not problems: they mark the service nodes that change how `$other` is checked below
// them, so the reason is visible where it applies. Meant to show as `info` in the editor (see the
// readme).

const recordKey = /['"]?\$\w+['"]?\s*:/

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Mark Firebase service nodes that change how `$other` is checked below them',
      url: docsUrl(__dirname),
    },
    messages: {
      serviceOwned: '`{{name}}` belongs to `{{check}}`: records below may get unlisted keys only ' +
        'from it, their data from nobody.',
    },
    schema: [],
  },

  create(context) {
    const { sourceCode } = context

    return forEachRulesKey(context, ({ node, name, path, service }) => {
      if (!service?.check || !isServiceNode(path, service.name)) return
      if (!recordKey.test(sourceCode.getText(node.value))) return

      const data = { name, check: service.check.identifier }

      context.report({ node: node.key, messageId: 'serviceOwned', data })
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
