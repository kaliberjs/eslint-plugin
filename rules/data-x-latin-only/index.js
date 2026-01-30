const getProp = require('jsx-ast-utils/getProp')
const getLiteralPropValue = require('jsx-ast-utils/getLiteralPropValue')

module.exports = {
  meta: {
    type: 'problem',
    messages: {
      nonLatinDataX: 'The "data-x" attribute must use Latin characters only (a-z, 0-9, hyphens, underscores). Found invalid characters in: "{{value}}"',
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

        const value = getLiteralPropValue(dataXProp)
        if (typeof value !== 'string') return

        // Check for non-Latin characters (allow only ASCII alphanumeric, hyphens, underscores)
        // This rejects spaces, accented characters, and non-ASCII characters
        const latinPattern = /^[a-zA-Z0-9\-_]+$/
        if (!latinPattern.test(value)) {
          context.report({
            node: dataXProp,
            messageId: 'nonLatinDataX',
            data: { value }
          })
        }
      }
    }
  }
}
