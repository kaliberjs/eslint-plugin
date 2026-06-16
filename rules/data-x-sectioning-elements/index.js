const hasProp = require('jsx-ast-utils/hasProp')
const docsUrl = require('../../machinery/docsUrl')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Sectioning HTML elements (section, header, footer, nav, etc.) must have data-x',
      url: docsUrl(__dirname),
    },
    messages: {
      missingSectioningDataX: 'Sectioning element "<{{element}}>" must have a "data-x" attribute for tracking.',
    },
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        if (!node.name || node.name.type !== 'JSXIdentifier') return

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
