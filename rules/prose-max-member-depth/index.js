const docsUrl = require('../../machinery/docsUrl')
const { getMemberExpressionDepth } = require('../../machinery/prose/ast')

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce a maximum member expression chain depth to prevent deep property access.',
      url: docsUrl(__dirname),
    },
    schema: [
      {
        type: 'object',
        properties: {
          max: { type: 'integer', minimum: 1 },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      maxMemberDepth:
        'Member access chain is {{depth}} levels deep (max {{max}}). Destructure or extract a named intermediate.',
    },
  },

  create(context) {
    const options = context.options[0] || {}
    const max = options.max ?? 3

    return {
      MemberExpression(node) {
        if (isIntermediateMemberExpression(node)) return

        const depth = getMemberExpressionDepth(node)
        if (depth <= max) return

        context.report({
          node,
          messageId: 'maxMemberDepth',
          data: { depth: String(depth), max: String(max) },
        })
      },
    }
  },
}

function isIntermediateMemberExpression(node) {
  const parent = node.parent
  return (
    parent.type === 'MemberExpression' && parent.object === node
  )
}
