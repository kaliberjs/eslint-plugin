const getProp = require('jsx-ast-utils/getProp')
const getLiteralPropValue = require('jsx-ast-utils/getLiteralPropValue')
const docsUrl = require('../../machinery/docsUrl')

module.exports = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description: 'Call-to-action <a> elements must use the cta- prefix in data-x',
      url: docsUrl(__dirname),
    },
    messages: {
      ctaNeedsPrefix: 'Call-to-action links (not packaged as buttons) should use "cta-" prefix in data-x attribute. Got "{{value}}", expected "cta-{{value}}"',
    },
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        const elementName = node.name.name

        // Only check <a> elements (not <button>)
        if (elementName !== 'a') return

        const dataXProp = getProp(node.attributes, 'data-x')
        if (!dataXProp) return

        const dataXValue = getLiteralPropValue(dataXProp)
        if (typeof dataXValue !== 'string') return

        // Skip if already has cta- prefix or other recognized prefixes
        if (
          dataXValue.startsWith('cta-') ||
          dataXValue.startsWith('nav-') ||
          dataXValue.startsWith('clickout-') ||
          dataXValue.startsWith('toggle-') ||
          dataXValue.startsWith('scroll-')
        ) {
          return
        }

        // Check if the link looks like a CTA based on common patterns
        // CTAs often have words like: apply, submit, register, signup, download, contact, get, start, join
        const ctaPatterns = /^(apply|submit|register|signup|sign-up|download|contact|get|start|join|book|order|buy|purchase|subscribe|request)/i

        if (ctaPatterns.test(dataXValue)) {
          context.report({
            node: dataXProp,
            messageId: 'ctaNeedsPrefix',
            data: { value: dataXValue },
            fix(fixer) {
              return fixer.replaceText(dataXProp.value, `"cta-${dataXValue}"`)
            }
          })
        }
      }
    }
  }
}
