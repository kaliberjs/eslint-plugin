const hasProp = require('jsx-ast-utils/hasProp')
const docsUrl = require('../../machinery/docsUrl')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Every <a> and <button> must have a data-x tracking attribute',
      url: docsUrl(__dirname),
    },
    messages: {
      missingDataX: 'Missing required "data-x" attribute on {{elementType}} element in page template',
    },
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        const elementName = node.name.name

        // Only check <a> and <button> elements
        if (elementName !== 'a' && elementName !== 'button') return

        // Check if data-x attribute exists
        if (!hasProp(node.attributes, 'data-x')) {
          context.report({
            node,
            messageId: 'missingDataX',
            data: {
              elementType: elementName
            }
          })
        }
      }
    }
  }
}
