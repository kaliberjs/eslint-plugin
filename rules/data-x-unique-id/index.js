const getProp = require('jsx-ast-utils/getProp')
const getLiteralPropValue = require('jsx-ast-utils/getLiteralPropValue')
const hasProp = require('jsx-ast-utils/hasProp')

module.exports = {
  meta: {
    type: 'problem',
    messages: {
      needsUniqueId: 'Elements with the same data-x="{{dataX}}" in lists or repeated contexts should include "data-x-id" with a unique identifier (e.g., job_id, article_id)',
    },
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        const elementName = node.name.name
        
        // Only check <a> and <button> elements
        if (elementName !== 'a' && elementName !== 'button') return

        const dataXProp = getProp(node.attributes, 'data-x')
        if (!dataXProp) return

        const dataXValue = getLiteralPropValue(dataXProp)
        if (typeof dataXValue !== 'string') return

        // Check if this element is inside a map function (indicating a list)
        let currentNode = node
        let isInMap = false
        
        while (currentNode && currentNode.parent) {
          currentNode = currentNode.parent
          
          // Check for .map( pattern
          if (
            (currentNode.type === 'CallExpression' || currentNode.type === 'OptionalCallExpression') &&
            currentNode.callee &&
            (currentNode.callee.type === 'MemberExpression' || currentNode.callee.type === 'OptionalMemberExpression') &&
            currentNode.callee.property &&
            currentNode.callee.property.name === 'map'
          ) {
            isInMap = true
            break
          }
        }

        // If in a map and doesn't have data-x-id, suggest adding it
        if (isInMap && !hasProp(node.attributes, 'data-x-id')) {
          context.report({
            node: dataXProp,
            messageId: 'needsUniqueId',
            data: { dataX: dataXValue }
          })
        }
      }
    }
  }
}
