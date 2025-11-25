const getProp = require('jsx-ast-utils/getProp')
const getLiteralPropValue = require('jsx-ast-utils/getLiteralPropValue')
const hasProp = require('jsx-ast-utils/hasProp')

module.exports = {
  meta: {
    type: 'suggestion',
    messages: {
      dynamicContentWarning: 'Body content from ATS/CRM systems should use sanitized data-x values. Consider using format: "{{suggestionType}}-{{sanitizedQuestion}}" with data-x-id for unique identification',
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
        
        // Check if data-x is an expression (dynamic) rather than a literal string
        const isExpression = dataXProp.value && dataXProp.value.type === 'JSXExpressionContainer'
        
        if (isExpression) {
          // This is dynamic content - check if it has data-x-context or data-x-id for proper tracking
          const hasContext = hasProp(node.attributes, 'data-x-context')
          const hasId = hasProp(node.attributes, 'data-x-id')
          
          if (!hasContext && !hasId) {
            context.report({
              node: dataXProp,
              messageId: 'dynamicContentWarning',
              data: { 
                suggestionType: 'toggle',
                sanitizedQuestion: 'question'
              }
            })
          }
        }
        
        // Also check for common ATS/CRM patterns in static values
        if (typeof dataXValue === 'string') {
          const dynamicPatterns = /(sanitized|question|article|content|dynamic)/i
          
          if (dynamicPatterns.test(dataXValue)) {
            // This looks like it might be handling dynamic content
            // Ensure it has proper ID for tracking
            if (!hasProp(node.attributes, 'data-x-id')) {
              // Soft suggestion - these should have IDs for proper tracking
              // But we won't enforce strictly as it depends on the use case
            }
          }
        }
      }
    }
  }
}
