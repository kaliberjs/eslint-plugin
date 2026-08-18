const docsUrl = require('../../machinery/docsUrl')

const messages = {
  namedHandler:
    'Extract this event handler into a named function so the JSX reads as intent.',
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require named functions for multi-statement JSX event handlers.',
      url: docsUrl(__dirname),
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxStatements: { type: 'integer', minimum: 0 },
        },
        additionalProperties: false,
      },
    ],
    messages,
  },

  create(context) {
    const options = context.options[0] || {}
    const maxStatements = options.maxStatements ?? 1

    return {
      JSXAttribute(node) {
        if (!isEventHandlerProp(node)) return

        const handler = getInlineHandler(node)
        if (!handler) return
        if (!handler.body || handler.body.type !== 'BlockStatement') return

        const statementCount = handler.body.body.length
        if (statementCount <= maxStatements) return

        context.report({
          node: handler,
          messageId: 'namedHandler',
        })
      },
    }
  },
}

function isEventHandlerProp(node) {
  const name = node.name
  if (!name || name.type !== 'JSXIdentifier') return false
  return /^on[A-Z]/.test(name.name)
}

function getInlineHandler(node) {
  if (!node.value || node.value.type !== 'JSXExpressionContainer') return null
  const expression = node.value.expression
  if (
    expression.type === 'ArrowFunctionExpression' ||
    expression.type === 'FunctionExpression'
  ) {
    return expression
  }
  return null
}
