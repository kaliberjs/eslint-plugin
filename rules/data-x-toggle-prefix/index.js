const getProp = require('jsx-ast-utils/getProp')
const getLiteralPropValue = require('jsx-ast-utils/getLiteralPropValue')

module.exports = {
  meta: {
    type: 'problem',
    messages: {
      needsTogglePrefix: 'Toggle/accordion components should use "toggle-" prefix in data-x attribute. Expected "toggle-{{value}}" but got "{{value}}"',
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

        const dataXValue = getLiteralPropValue(dataXProp)
        if (typeof dataXValue !== 'string') return

        // Skip if already has toggle- prefix
        if (dataXValue.startsWith('toggle-')) return

        // Check for toggle-like patterns
        const togglePatterns = /^(accordion|menu|dropdown|collapse|expand|faq|question|answer|drawer|sidebar|panel)/i
        
        // Also check for aria-expanded attribute which indicates a toggle
        const ariaExpanded = getProp(node.attributes, 'aria-expanded')
        const hasAriaExpanded = !!ariaExpanded
        
        // Only report if it matches the pattern OR has aria-expanded (but not both to avoid duplicates)
        if (togglePatterns.test(dataXValue)) {
          const baseValue = dataXValue.replace(/^(open-|close-|show-|hide-)/, '')
          
          context.report({
            node: dataXProp,
            messageId: 'needsTogglePrefix',
            data: { value: baseValue }
          })
        } else if (hasAriaExpanded) {
          // Only report for aria-expanded if it didn't match the pattern above
          const baseValue = dataXValue.replace(/^(open-|close-|show-|hide-)/, '')
          
          context.report({
            node: dataXProp,
            messageId: 'needsTogglePrefix',
            data: { value: baseValue }
          })
        }
      }
    }
  }
}
