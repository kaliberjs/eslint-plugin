const docsUrl = require('../../machinery/docsUrl')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects disabling of HTML entity escaping in template engines, which can lead to XSS',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages: {
      mustacheEscapeDisabled: 'Disabling escapeMarkup can lead to Cross-Site Scripting (XSS) vulnerabilities',
    },
  },
  create(context) {
    return {
      AssignmentExpression(node) {
        if (
          node.operator === '=' &&
          node.left.type === 'MemberExpression' &&
          node.left.property.type === 'Identifier' &&
          node.left.property.name === 'escapeMarkup' &&
          node.right.type === 'Literal' &&
          node.right.value === false
        ) {
          context.report({ node, messageId: 'mustacheEscapeDisabled' })
        }
      },
    }
  },
}
