const getProp = require('jsx-ast-utils/getProp')
const getLiteralPropValue = require('jsx-ast-utils/getLiteralPropValue')
const dataXConfig = require('../../lib/data-x-config')

const verbPattern = dataXConfig.getActionVerbPattern()


module.exports = {
  meta: {
    type: 'problem',
    messages: {
      invalidOnpageFormat: 'On-page actions should use format "{{action}}-{{target}}". Found: "{{value}}"',
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

        // Check if this looks like an on-page action (starts with a known verb)
        const onpageActionPattern = new RegExp(`^(cta-)?(${verbPattern})($|-)`, 'i')
        
        if (!onpageActionPattern.test(dataXValue)) return

        // Valid format: "verb-target" or "cta-verb-target"
        // The verb must be followed by a hyphen and a target name
        const validFormat = new RegExp(`^(cta-)?(${verbPattern})-[a-z0-9_-]+$`, 'i')
        
        if (!validFormat.test(dataXValue)) {
          context.report({
            node: dataXProp,
            messageId: 'invalidOnpageFormat',
            data: { 
              action: dataXValue.match(onpageActionPattern)?.[2] || 'action',
              target: 'target',
              value: dataXValue
            }
          })
        }
      }
    }
  }
}
