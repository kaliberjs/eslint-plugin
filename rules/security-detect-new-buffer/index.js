const docsUrl = require('../../machinery/docsUrl')
const { isStaticExpression } = require('../../machinery/security')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects new Buffer() with non-literal arguments, which can lead to memory disclosure',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages: {
      newBuffer: 'new Buffer() with a non-literal argument is unsafe — use Buffer.alloc() or Buffer.from() instead',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode()
    return {
      NewExpression(node) {
        const scope = sourceCode.getScope ? sourceCode.getScope(node) : context.getScope()
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'Buffer' &&
          node.arguments.length > 0 &&
          !isStaticExpression(node.arguments[0], scope)
        ) {
          context.report({ node, messageId: 'newBuffer' })
        }
      },
    }
  },
}
