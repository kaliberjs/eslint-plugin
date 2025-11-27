const getProp = require('jsx-ast-utils/getProp')
const getLiteralPropValue = require('jsx-ast-utils/getLiteralPropValue')

module.exports = {
  meta: {
    type: 'problem',
    messages: {
      formNameSuffix: 'Form data-x attribute must end with "-form". Got "{{value}}", expected "{{value}}-form".',
    },
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        const elementName = node.name.name
        
        // Only check <form> elements
        if (elementName !== 'form') return

        const dataXProp = getProp(node.attributes, 'data-x')
        if (!dataXProp) return

        const dataXValue = getLiteralPropValue(dataXProp)
        if (typeof dataXValue !== 'string') return

        // Check if data-x ends with "-form"
        if (!dataXValue.endsWith('-form')) {
          context.report({
            node: dataXProp,
            messageId: 'formNameSuffix',
            data: { value: dataXValue }
          })
        }
      }
    }
  }
}
