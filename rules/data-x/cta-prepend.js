const hasProp = require('jsx-ast-utils/hasProp')
const getPropValue = require('jsx-ast-utils/getPropValue')

module.exports = {
  meta: {
    type: 'problem',
    messages: {
      missingCtaPrefix: 'CTA elements must prepend "cta-" to their data-x value.'
    },
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        if (!hasProp(node.attributes, 'data-x')) return
        const val = getPropValue(node, 'data-x')
        if (val && val.includes('applyform') && !/^cta-/.test(val)) {
          context.report({ node, messageId: 'missingCtaPrefix' })
        }
      }
    }
  }
}
