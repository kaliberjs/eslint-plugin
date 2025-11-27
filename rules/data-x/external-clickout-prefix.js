const hasProp = require('jsx-ast-utils/hasProp')
const getPropValue = require('jsx-ast-utils/getPropValue')

module.exports = {
  meta: {
    type: 'problem',
    messages: {
      missingClickout: 'External links must use data-x starting with "clickout-".'
    },
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        const tag = node.name && node.name.name
        if (tag !== 'a') return
        if (!hasProp(node.attributes, 'href') || !hasProp(node.attributes, 'data-x')) return

        const href = getPropValue(node, 'href')
        const datax = getPropValue(node, 'data-x')

        if (/^https?:\/\//.test(href) && !/^clickout-/.test(datax)) {
          context.report({ node, messageId: 'missingClickout' })
        }
      }
    }
  }
}
