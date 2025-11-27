const hasProp = require('jsx-ast-utils/hasProp')
const getPropValue = require('jsx-ast-utils/getPropValue')

module.exports = {
  meta: {
    type: 'problem',
    messages: {
      nonEnglish: '"data-x" values must be English (ASCII only).'
    },
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        if (!hasProp(node.attributes, 'data-x')) return
        const val = getPropValue(node, 'data-x')
        if (/[^\x00-\x7F]/.test(val)) {
          context.report({ node, messageId: 'nonEnglish' })
        }
      }
    }
  }
}
