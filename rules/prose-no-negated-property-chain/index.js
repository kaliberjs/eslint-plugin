const docsUrl = require('../../machinery/docsUrl')
const {
  getMemberExpressionDepth,
  unwrapExpression,
} = require('../../machinery/prose/ast')

const messages = {
  negatedPropertyChain:
    'Avoid negated property access. Extract this condition into a named predicate that says what is missing or invalid.',
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow negated property access such as !response.data._type',
      url: docsUrl(__dirname),
    },
    schema: [
      {
        type: 'object',
        properties: {
          minDepth: {
            type: 'integer',
            minimum: 1,
          },
        },
        additionalProperties: false,
      },
    ],
    messages,
  },

  create(context) {
    const options = context.options[0] || {}
    const minDepth = options.minDepth || 1

    return {
      UnaryExpression(node) {
        if (node.operator !== '!') return

        const argument = unwrapExpression(node.argument)
        if (getMemberExpressionDepth(argument) < minDepth) return

        context.report({
          node,
          messageId: 'negatedPropertyChain',
        })
      },
    }
  },
}
