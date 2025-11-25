const getProp = require('jsx-ast-utils/getProp')
const getLiteralPropValue = require('jsx-ast-utils/getLiteralPropValue')

module.exports = {
  meta: {
    type: 'problem',
    messages: {
      nonEnglishDataX: 'The "data-x" attribute must be language-independent (English). Found non-English characters or spaces in: "{{value}}"',
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

        // Check for non-English characters (allow only ASCII alphanumeric, hyphens, underscores)
        // This rejects spaces, accented characters, and non-ASCII characters
        const englishPattern = /^[a-zA-Z0-9\-_]+$/
        if (!englishPattern.test(value)) {
          context.report({
            node: dataXProp,
            messageId: 'nonEnglishDataX',
            data: { value }
          })
        }
      }
    }
  }
}
