const docsUrl = require('../../machinery/docsUrl')
const {
  getMemberExpressionDepth,
  isArrayMethodCall,
  unwrapExpression,
} = require('../../machinery/prose/ast')

const messages = {
  namedCallback:
    'Extract this array callback into a named function so the collection operation reads as intent.',
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require named callbacks for complex filter, find, some, every, and map operations',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages,
  },

  create(context) {
    return {
      CallExpression(node) {
        if (!isArrayMethodCall(node)) return

        const [callback] = node.arguments
        if (!isInlineFunction(callback)) return
        if (!isComplexCallback(callback)) return

        context.report({
          node: callback,
          messageId: 'namedCallback',
        })
      },
    }
  },
}

function isInlineFunction(node) {
  const expression = unwrapExpression(node)
  return Boolean(
    expression &&
    ['ArrowFunctionExpression', 'FunctionExpression'].includes(expression.type)
  )
}

function isComplexCallback(callback) {
  const body = getCallbackBody(callback)
  if (!body) return true
  if (isSimpleProjection(body)) return false

  return (
    hasNodeType(body, ['LogicalExpression', 'ConditionalExpression']) ||
    hasComparison(body) ||
    hasNestedMemberExpression(body) ||
    hasMultiPropertyObjectExpression(body)
  )
}

function isSimpleProjection(node) {
  const expression = unwrapExpression(node)
  if (!expression) return false

  // item => item.name  or  ({ name }) => name
  if (expression.type === 'Identifier') return true
  if (expression.type === 'MemberExpression') return getMemberExpressionDepth(expression) <= 1

  // item => ({ id: item.id }) — single-property object
  if (expression.type === 'ObjectExpression' && expression.properties.length === 1) {
    const prop = expression.properties[0]
    if (prop.type !== 'Property') return false
    return isSimpleProjection(prop.value)
  }

  return false
}

function getCallbackBody(callback) {
  const body = unwrapExpression(callback.body)
  if (!body) return null
  if (body.type !== 'BlockStatement') return body

  const statements = body.body.filter(statement => statement.type !== 'EmptyStatement')
  if (statements.length !== 1) return null

  const [statement] = statements
  return statement.type === 'ReturnStatement' ? statement.argument : null
}

function hasComparison(node) {
  const expression = unwrapExpression(node)
  if (!expression) return false
  if (expression.type === 'BinaryExpression') return true

  return getChildNodes(expression).some(hasComparison)
}

function hasNestedMemberExpression(node) {
  const expression = unwrapExpression(node)
  if (!expression) return false
  if (getMemberExpressionDepth(expression) > 1) return true

  return getChildNodes(expression).some(hasNestedMemberExpression)
}

function hasMultiPropertyObjectExpression(node) {
  const expression = unwrapExpression(node)
  if (!expression) return false
  if (expression.type === 'ObjectExpression') return expression.properties.length > 1

  return getChildNodes(expression).some(hasMultiPropertyObjectExpression)
}

function hasNodeType(node, types) {
  const expression = unwrapExpression(node)
  if (!expression) return false
  if (types.includes(expression.type)) return true

  return getChildNodes(expression).some(child => hasNodeType(child, types))
}

function getChildNodes(node) {
  return Object.entries(node).flatMap(([key, value]) => {
    if (key === 'parent') return []
    if (!value) return []
    if (Array.isArray(value)) return value.filter(isAstNode)
    return isAstNode(value) ? [value] : []
  })
}

function isAstNode(value) {
  return Boolean(value && typeof value === 'object' && typeof value.type === 'string')
}
