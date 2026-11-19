const docsUrl = require('../../machinery/docsUrl')
const { isStaticExpression } = require('../../machinery/security')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects eval() called with a non-literal expression, which can allow arbitrary code execution',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages: {
      evalWithExpression: 'eval() called with a non-literal argument — this allows arbitrary code execution',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode()
    return {
      CallExpression(node) {
        const scope = sourceCode.getScope ? sourceCode.getScope(node) : context.getScope()
        if (node.callee.type === 'Identifier' && node.callee.name === 'eval' && node.arguments.length > 0) {
          if (!isStaticExpression(node.arguments[0], scope)) {
            context.report({ node, messageId: 'evalWithExpression' })
          }
        }
      },
    }
  },
}
