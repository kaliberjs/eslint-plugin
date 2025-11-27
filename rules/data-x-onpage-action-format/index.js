const getProp = require('jsx-ast-utils/getProp')
const getLiteralPropValue = require('jsx-ast-utils/getLiteralPropValue')

module.exports = {
  meta: {
    type: 'problem',
    messages: {
      invalidOnpageFormat: 'On-page actions should use format "{{action}}-{{target}}" or "cta-{{action}}-{{target}}". Examples: "scroll-applyform", "cta-scroll-contact"',
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

        // Check for on-page actions (scroll, etc.)
        const onpageActionPattern = /^(scroll|open|close|show|hide|expand|collapse)/i
        
        if (!onpageActionPattern.test(dataXValue)) return

        // Valid formats:
        // 1. "scroll-targetname" 
        // 2. "cta-scroll-targetname"
        const validFormat = /^(cta-)?(scroll|open|close|show|hide|expand|collapse)-[a-z0-9_-]+$/i
        
        if (!validFormat.test(dataXValue)) {
          const action = dataXValue.match(onpageActionPattern)?.[1] || 'action'
          context.report({
            node: dataXProp,
            messageId: 'invalidOnpageFormat',
            data: { action, target: 'target' }
          })
        }
      }
    }
  }
}
