const getProp = require('jsx-ast-utils/getProp')
const getLiteralPropValue = require('jsx-ast-utils/getLiteralPropValue')

module.exports = {
  meta: {
    type: 'problem',
    messages: {
      missingClickoutPrefix: 'External links must use "clickout-" prefix in data-x attribute. Expected "clickout-*" but got "{{value}}"',
    },
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        const elementName = node.name.name
        
        // Only check <a> elements for external links
        if (elementName !== 'a') return

        const hrefProp = getProp(node.attributes, 'href')
        if (!hrefProp) return

        const href = getLiteralPropValue(hrefProp)
        if (typeof href !== 'string') return

        // Check if this is an external link (starts with http:// or https://)
        const isExternalLink = /^https?:\/\//i.test(href)
        if (!isExternalLink) return

        const dataXProp = getProp(node.attributes, 'data-x')
        if (!dataXProp) return

        const dataXValue = getLiteralPropValue(dataXProp)
        if (typeof dataXValue !== 'string') return

        // Check if data-x starts with "clickout-"
        if (!dataXValue.startsWith('clickout-')) {
          context.report({
            node: dataXProp,
            messageId: 'missingClickoutPrefix',
            data: { value: dataXValue }
          })
        }
      }
    }
  }
}
