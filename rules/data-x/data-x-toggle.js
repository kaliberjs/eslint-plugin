const hasProp = require('jsx-ast-utils/hasProp')
const getPropValue = require('jsx-ast-utils/getPropValue')

module.exports = {
  meta: {
    type: 'problem',
    messages: {
      missingToggle: 'Toggle components must include "toggle" in their data-x value.'
    },
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        if (!hasProp(node.attributes, 'data-x')) return
        const val = getPropValue(node, 'data-x')
        if (/accordion|menu/.test(val) && !val.includes('toggle')) {
          context.report({ node, messageId: 'missingToggle' })
        }
      }
    }
  }
}
