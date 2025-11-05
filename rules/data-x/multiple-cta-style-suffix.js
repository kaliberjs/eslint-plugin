const hasProp = require('jsx-ast-utils/hasProp')
const getPropValue = require('jsx-ast-utils/getPropValue')

module.exports = {
  meta: {
    type: 'problem',
    messages: {
      missingStyle: 'Multiple CTA variants must append "-{{kleur/stijl}}" at the end of data-x value.'
    },
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        if (!hasProp(node.attributes, 'data-x')) return
        const val = getPropValue(node, 'data-x')
        if (val && val.startsWith('cta-') && !/-[a-z]+$/.test(val)) {
          context.report({ node, messageId: 'missingStyle' })
        }
      }
    }
  }
}
