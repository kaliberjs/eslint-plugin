const getProp = require('jsx-ast-utils/getProp')
const getLiteralPropValue = require('jsx-ast-utils/getLiteralPropValue')

module.exports = {
  meta: {
    type: 'problem',
    messages: {
      needsStyleSuffix: 'Multiple CTA buttons with different styles should include a style suffix (e.g., "-primary", "-secondary"). Current value: "{{value}}"',
    },
  },

  create(context) {
    // Track CTA data-x values seen in the current file
    const ctaButtons = new Map()

    return {
      JSXOpeningElement(node) {
        const elementName = node.name.name
        
        // Only check <button> elements
        if (elementName !== 'button') return

        const dataXProp = getProp(node.attributes, 'data-x')
        if (!dataXProp) return

        const dataXValue = getLiteralPropValue(dataXProp)
        if (typeof dataXValue !== 'string') return

        // Only check CTA-like buttons
        const isCTA = /^(cta-|apply|submit|register|signup|download|contact|get|start|join)/i.test(dataXValue)
        if (!isCTA) return

        // Check if there's a className prop to determine style variants
        const classNameProp = getProp(node.attributes, 'className')
        const className = classNameProp ? getLiteralPropValue(classNameProp) : ''

        // Track this button
        const baseValue = dataXValue.replace(/-(primary|secondary|tertiary|outline|ghost)$/i, '')
        
        if (!ctaButtons.has(baseValue)) {
          ctaButtons.set(baseValue, [])
        }
        
        ctaButtons.get(baseValue).push({
          node: dataXProp,
          dataXValue,
          className,
          hasStyleSuffix: /-(primary|secondary|tertiary|outline|ghost)$/i.test(dataXValue)
        })
      },

      'Program:exit'() {
        // Check each group of CTAs
        ctaButtons.forEach((buttons, baseValue) => {
          // If there are multiple buttons with the same base value and different classes,
          // they should have style suffixes
          if (buttons.length > 1) {
            const uniqueClasses = new Set(buttons.map(b => b.className))
            
            // If multiple different class names, check for style suffixes
            if (uniqueClasses.size > 1) {
              buttons.forEach(button => {
                if (!button.hasStyleSuffix) {
                  context.report({
                    node: button.node,
                    messageId: 'needsStyleSuffix',
                    data: { value: button.dataXValue }
                  })
                }
              })
            }
          }
        })
      }
    }
  }
}
