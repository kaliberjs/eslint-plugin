const getProp = require('jsx-ast-utils/getProp')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Elements with data-x must also include data-x-context to identify page location',
      url: `file://${__dirname}/readme.md`,
    },
    schema: [],
    messages: {
      missingDataXContext: 'Missing required "data-x-context" attribute on {{elementType}} element with "data-x"',
    },
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        const elementName = node.name.name

        // Only check <a> and <button> elements
        if (elementName !== 'a' && elementName !== 'button') return

        const dataXProp = getProp(node.attributes, 'data-x')
        if (!dataXProp) return

        const dataXContextProp = getProp(node.attributes, 'data-x-context')
        if (!dataXContextProp) {
          context.report({
            node,
            messageId: 'missingDataXContext',
            data: { elementType: elementName }
          })
        }
      }
    }
  }
}
