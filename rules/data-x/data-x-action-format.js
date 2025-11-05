const hasProp = require('jsx-ast-utils/hasProp')
const getPropValue = require('jsx-ast-utils/getPropValue')

module.exports = {
  meta: {
    type: 'problem',
    messages: {
      invalidFormat: 'data-x actions must follow the format "{{action}}--{{target}}".'
    },
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        if (!hasProp(node.attributes, 'data-x')) return
        const val = getPropValue(node, 'data-x')
        if (!/^[a-z0-9-]+--[a-z0-9-]+$/.test(val)) {
          context.report({ node, messageId: 'invalidFormat' })
        }
      }
    }
  }
}
