const docsUrl = require('../../machinery/docsUrl')
const { isStaticExpression } = require('../../machinery/security')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects require() with non-literal arguments, which can allow loading arbitrary modules',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages: {
      nonLiteralRequire: 'require() called with a non-literal argument — this can allow an attacker to load arbitrary modules',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode()
    return {
      CallExpression(node) {
        const scope = sourceCode.getScope ? sourceCode.getScope(node) : context.getScope()
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length > 0 &&
          !isStaticExpression(node.arguments[0], scope)
        ) {
          context.report({ node, messageId: 'nonLiteralRequire' })
        }
      },
    }
  },
}
