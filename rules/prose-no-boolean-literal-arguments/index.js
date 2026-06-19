const docsUrl = require('../../machinery/docsUrl')
const {
  getCalleeName,
  isBooleanLiteral,
} = require('../../machinery/prose/ast')

const messages = {
  booleanLiteralArgument:
    'Avoid bare boolean arguments. Use a named options object so the call site explains what the boolean means.',
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow bare true/false arguments at call sites',
      url: docsUrl(__dirname),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowCallees: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
    messages,
  },

  create(context) {
    const options = context.options[0] || {}
    const allowCallees = new Set(options.allowCallees || [])

    return {
      CallExpression: reportBooleanLiteralArguments,
      NewExpression: reportBooleanLiteralArguments,
    }

    function reportBooleanLiteralArguments(node) {
      const calleeName = getCalleeName(node.callee)
      if (calleeName && allowCallees.has(calleeName)) return

      for (const argument of node.arguments) {
        if (!isBooleanLiteral(argument)) continue

        context.report({
          node: argument,
          messageId: 'booleanLiteralArgument',
        })
      }
    }
  },
}
