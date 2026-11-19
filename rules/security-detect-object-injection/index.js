const docsUrl = require('../../machinery/docsUrl')

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Detects variable bracket access on objects, which can enable prototype pollution',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages: {
      objectInjection: 'Variable used as key in bracket notation (obj[{{name}}]) — this can enable prototype pollution',
    },
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (
          node.computed &&
          node.property.type === 'Identifier'
        ) {
          const { parent } = node
          if (parent.type === 'ForInStatement' || parent.type === 'ForOfStatement') return
          context.report({
            node,
            messageId: 'objectInjection',
            data: { name: node.property.name },
          })
        }
      },
    }
  },
}
