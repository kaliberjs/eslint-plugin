const docsUrl = require('../../machinery/docsUrl')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects crypto.pseudoRandomBytes() which is not cryptographically strong',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages: {
      pseudoRandomBytes: 'crypto.pseudoRandomBytes() is not cryptographically strong — use crypto.randomBytes() instead',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'pseudoRandomBytes'
        ) {
          context.report({ node, messageId: 'pseudoRandomBytes' })
        }
      },
    }
  },
}
