const { getPropertyName } = require('../../machinery/ast')

const messages = {
  'no place-content center':
    `Avoid using 'place-content: center'. It only aligns tracks when there is extra space ` +
    `and often does nothing in single-line flex or simple grid layouts. ` +
    `In most cases you probably want 'place-items: center' (for centering items) ` +
    `or 'align-items' / 'justify-content' instead.`
}

module.exports = {
  messages,

  meta: {
    type: 'suggestion',
  },

  create(context) {
    return {
      Property(node) {
        const keyName = getPropertyName(node.key)
        if (keyName !== 'placeContent' && keyName !== 'place-content') return

        const valueNode = node.value

        // placeContent: 'center'
        if (valueNode.type === 'Literal' && valueNode.value === 'center') {
          reportPlaceContentCenter(valueNode)
          return
        }

        // placeContent: `center`
        if (valueNode.type === 'TemplateLiteral') {
          const [quasi] = valueNode.quasis
          if (quasi.value.raw.trim() === 'center') {
            reportPlaceContentCenter(valueNode)
            return
          }
        }
      },
    }

    function reportPlaceContentCenter(node) {
      context.report({
        node,
        message: messages['no place-content center']
      })
    }
  }
}
