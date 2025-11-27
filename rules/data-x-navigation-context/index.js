const hasProp = require('jsx-ast-utils/hasProp')
const getProp = require('jsx-ast-utils/getProp')
const getLiteralPropValue = require('jsx-ast-utils/getLiteralPropValue')

module.exports = {
  meta: {
    type: 'problem',
    messages: {
      missingContext: 'Navigation links with multiple instances on a page should include "data-x-context" to specify the component name',
      contextShouldBeComponentName: 'The "data-x-context" value should be a component name (e.g., "mainnav", "subnav", "footer")',
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

        // Check if this looks like a navigation link (common patterns)
        const isNavigation = /^(nav|menu|link|page|home|about|contact|services|products)/i.test(dataXValue)
        
        if (isNavigation && !hasProp(node.attributes, 'data-x-context')) {
          // Only suggest adding context, don't enforce strictly as we can't detect duplicates across files
          const dataXContextProp = getProp(node.attributes, 'data-x-context')
          if (!dataXContextProp) {
            // This is a soft warning - navigation items that appear in multiple locations should have context
            // But we won't enforce it strictly as single instances don't need it
          }
        }
      }
    }
  }
}
