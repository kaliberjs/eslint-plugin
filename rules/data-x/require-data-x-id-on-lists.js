const hasProp = require('jsx-ast-utils/hasProp')

module.exports = {
  meta: {
    type: 'problem',
    messages: {
      missingId: 'Repeated list items should include a "data-x-id" attribute.'
    },
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        const tag = node.name && node.name.name
        if (!tag) return
        if (!hasProp(node.attributes, 'data-x') && !hasProp(node.attributes, 'data-x-id')) return

        // Heuristic: inside a map or list-like structure
        if (node.parent && node.parent.type === 'JSXElement' &&
            node.parent.openingElement.name.name === 'ul' &&
            !hasProp(node.attributes, 'data-x-id')) {
          context.report({ node, messageId: 'missingId' })
        }
      }
    }
  }
}
