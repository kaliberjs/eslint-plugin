const docsUrl = require('../../machinery/docsUrl')
const { isStaticExpression } = require('../../machinery/security')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects RegExp() with non-literal arguments, which can lead to ReDoS attacks',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages: {
      nonLiteralRegexp: 'RegExp() called with a non-literal argument — this can lead to ReDoS (Regular Expression Denial of Service)',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode()
    return {
      NewExpression(node) {
        const scope = sourceCode.getScope ? sourceCode.getScope(node) : context.getScope()
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'RegExp' &&
          node.arguments.length > 0 &&
          !isStaticExpression(node.arguments[0], scope)
        ) {
          context.report({ node, messageId: 'nonLiteralRegexp' })
        }
      },
      CallExpression(node) {
        const scope = sourceCode.getScope ? sourceCode.getScope(node) : context.getScope()
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'RegExp' &&
          node.arguments.length > 0 &&
          !isStaticExpression(node.arguments[0], scope)
        ) {
          context.report({ node, messageId: 'nonLiteralRegexp' })
        }
      },
    }
  },
}
