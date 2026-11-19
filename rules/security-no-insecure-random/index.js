const docsUrl = require('../../machinery/docsUrl')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects Math.random() which is not cryptographically secure — use crypto.randomBytes() or crypto.randomUUID() instead',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages: {
      insecureRandom: 'Math.random() is not cryptographically secure — use crypto.randomBytes() or crypto.randomUUID() for security-sensitive operations',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'Math' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'random'
        ) {
          context.report({ node, messageId: 'insecureRandom' })
        }
      },
    }
  },
}
