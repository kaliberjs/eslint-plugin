const docsUrl = require('../../machinery/docsUrl')
const {
  getCalleeName,
  getMemberExpressionDepth,
  isPredicateName,
  isSimpleNullishComparison,
  unwrapExpression,
} = require('../../machinery/prose/ast')

const messages = {
  opaqueJsxCondition:
    'Extract this render condition into a named predicate so the JSX reads as intent.',
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow complex render conditions in JSX expressions',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages,
  },

  create(context) {
    return {
      LogicalExpression(node) {
        if (!isDirectJsxExpressionChild(node)) return
        if (node.operator !== '&&') return

        const condition = unwrapExpression(node.left)
        if (isReadableJsxCondition(condition)) return

        context.report({
          node: condition,
          messageId: 'opaqueJsxCondition',
        })
      },

      ConditionalExpression(node) {
        if (!isDirectJsxExpressionChild(node)) return

        const condition = unwrapExpression(node.test)
        if (isReadableJsxCondition(condition)) return

        context.report({
          node: condition,
          messageId: 'opaqueJsxCondition',
        })
      },
    }
  },
}

function isDirectJsxExpressionChild(node) {
  return node.parent && node.parent.type === 'JSXExpressionContainer'
}

function isReadableJsxCondition(node) {
  const expression = unwrapExpression(node)
  if (!expression) return false

  switch (expression.type) {
    case 'Identifier':
      return true
    case 'MemberExpression':
      return getMemberExpressionDepth(expression) <= 1
    case 'CallExpression':
      return isReadablePredicateCall(expression)
    case 'UnaryExpression':
      return isReadableNegation(expression)
    case 'BinaryExpression':
      return isSimpleNullishComparison(expression)
    default:
      return false
  }
}

function isReadablePredicateCall(node) {
  const name = getCalleeName(node.callee)
  return Boolean(name && isPredicateName(name.split('.').pop()))
}

function isReadableNegation(node) {
  if (node.operator !== '!') return false

  const argument = unwrapExpression(node.argument)
  if (!argument) return false

  if (argument.type === 'Identifier') return true
  if (argument.type === 'MemberExpression') return getMemberExpressionDepth(argument) <= 1

  return false
}
