const docsUrl = require('../../machinery/docsUrl')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects unsafe deserialization patterns that can lead to remote code execution',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages: {
      unsafeDeserialization: 'Unsafe deserialization via {{method}} — avoid deserializing untrusted data with code execution',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'eval') {
          if (
            node.arguments.length > 0 &&
            node.arguments[0].type === 'BinaryExpression' &&
            node.arguments[0].operator === '+'
          ) {
            context.report({
              node,
              messageId: 'unsafeDeserialization',
              data: { method: 'eval()' },
            })
          }
        }

        if (
          node.callee.type === 'Identifier' &&
          ['unserialize', 'deserialize'].includes(node.callee.name)
        ) {
          context.report({
            node,
            messageId: 'unsafeDeserialization',
            data: { method: node.callee.name + '()' },
          })
        }
      },
      NewExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'Function' &&
          node.arguments.length > 0 &&
          node.arguments[0].type !== 'Literal'
        ) {
          context.report({
            node,
            messageId: 'unsafeDeserialization',
            data: { method: 'new Function()' },
          })
        }
      },
    }
  },
}
