const hasProp = require('jsx-ast-utils/hasProp')

module.exports = {
  meta: {
    type: 'problem',
    messages: {
      missingSectioningDataX: 'Sectioning element "<{{element}}>" must have a "data-x" attribute for tracking.',
    },
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        const elementName = node.name.name
        
        // Check for sectioning elements defined in documentation
        const sectioningElements = ['form', 'section', 'header', 'footer', 'nav', 'main', 'aside']
        
        if (!sectioningElements.includes(elementName)) return

        // Check if data-x attribute exists
        if (!hasProp(node.attributes, 'data-x')) {
          context.report({
            node,
            messageId: 'missingSectioningDataX',
            data: {
              element: elementName
            }
          })
        }
      }
    }
  }
}
