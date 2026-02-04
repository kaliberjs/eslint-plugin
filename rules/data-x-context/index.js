const getProp = require('jsx-ast-utils/getProp')
const getLiteralPropValue = require('jsx-ast-utils/getLiteralPropValue')

module.exports = {
  meta: {
    type: 'problem',
    schema: [
      {
        type: 'object',
        properties: {
          allowedValues: {
            type: 'array',
            items: { type: 'string' }
          },
        },
        additionalProperties: false,
      }
    ],
    messages: {
      missingDataXContext: 'Missing required "data-x-context" attribute on {{elementType}} element in page template',
      invalidDataXContext: '"data-x-context" value "{{value}}" is not allowed. Allowed values: {{allowedValues}}',
    },
  },

  create(context) {
    const options = context.options[0] || {}
    const allowedValues = Array.isArray(options.allowedValues) ? options.allowedValues : []
    const hasAllowedValues = allowedValues.length > 0
    const allowedValuesSet = new Set(allowedValues)

    return {
      JSXOpeningElement(node) {
        const elementName = node.name.name

        // Only check <a> and <button> elements
        if (elementName !== 'a' && elementName !== 'button') return

        const dataXContextProp = getProp(node.attributes, 'data-x-context')
        if (!dataXContextProp) {
          context.report({
            node,
            messageId: 'missingDataXContext',
            data: { elementType: elementName }
          })
          return
        }

        // Optional strict mode with allowed context values
        if (!hasAllowedValues) return

        const dataXContextValue = getLiteralPropValue(dataXContextProp)
        if (typeof dataXContextValue !== 'string') return

        if (!allowedValuesSet.has(dataXContextValue)) {
          context.report({
            node: dataXContextProp,
            messageId: 'invalidDataXContext',
            data: {
              value: dataXContextValue,
              allowedValues: allowedValues.join(', ')
            }
          })
        }
      }
    }
  }
}
