const hasProp = require('jsx-ast-utils/hasProp')

module.exports = {
  meta: {
    type: 'problem',
    messages: {
      missingContext: '<a> or <button> must include a "data-x-context" attribute.'
    },
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        const tag = node.name && node.name.name
        if ((tag === 'a' || tag === 'button') && !hasProp(node.attributes, 'data-x-context')) {
          context.report({ node, messageId: 'missingContext' })
        }
      }
    }
  }
}
