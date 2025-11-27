const hasProp = require('jsx-ast-utils/hasProp')
const propName = require('jsx-ast-utils/propName')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require data-x on all <a> and <button> elements',
      category: 'Best Practices',
    },
    messages: {
      missingDataX: '<a> or <button> elements must have a "data-x" attribute',
    },
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        const tag = node.name && node.name.name
        if (tag !== 'a' && tag !== 'button') return

        if (!hasProp(node.attributes, 'data-x')) {
          context.report({
            node,
            messageId: 'missingDataX',
          })
        }
      },
    }
  },
}
