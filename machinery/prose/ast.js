const predicatePrefixes = ['is', 'has', 'can', 'should', 'was']
const proseArrayMethods = ['filter', 'find', 'some', 'every', 'map']
const nullishValues = new Set([null, 'undefined'])

module.exports = {
  predicatePrefixes,
  proseArrayMethods,
  getCalleeName,
  getIdentifierName,
  getMemberExpressionDepth,
  getPropertyName,
  getStaticLiteralValue,
  getVariableName,
  isArrayMethodCall,
  isBooleanLiteral,
  isBooleanishExpression,
  isLiteral,
  isNullishLiteral,
  isPredicateName,
  isSimpleNullishComparison,
  unwrapExpression,
}

function unwrapExpression(node) {
  if (!node) return node

  switch (node.type) {
    case 'ChainExpression':
      return unwrapExpression(node.expression)
    case 'ParenthesizedExpression':
      return unwrapExpression(node.expression)
    case 'TSAsExpression':
    case 'TSTypeAssertion':
    case 'TypeCastExpression':
      return unwrapExpression(node.expression)
    default:
      return node
  }
}

function getIdentifierName(node) {
  const expression = unwrapExpression(node)
  return expression && expression.type === 'Identifier' ? expression.name : null
}

function getVariableName(node) {
  if (!node) return null

  switch (node.type) {
    case 'Identifier':
      return node.name
    case 'RestElement':
      return getVariableName(node.argument)
    case 'AssignmentPattern':
      return getVariableName(node.left)
    default:
      return null
  }
}

function getPropertyName(node) {
  if (!node) return null

  switch (node.type) {
    case 'Identifier':
      return node.name
    case 'PrivateIdentifier':
      return node.name
    case 'Literal':
      return String(node.value)
    default:
      return null
  }
}

function getCalleeName(node) {
  const callee = unwrapExpression(node)
  if (!callee) return null
  if (callee.type === 'Identifier') return callee.name
  if (callee.type !== 'MemberExpression') return null

  const propertyName = getPropertyName(callee.property)
  const objectName = getCalleeName(callee.object)
  return objectName && propertyName ? `${objectName}.${propertyName}` : propertyName
}

function getMemberExpressionDepth(node) {
  const expression = unwrapExpression(node)
  if (!expression || expression.type !== 'MemberExpression') return 0
  return 1 + getMemberExpressionDepth(expression.object)
}

function getStaticLiteralValue(node) {
  const expression = unwrapExpression(node)
  if (!expression || expression.type !== 'Literal') return undefined
  return expression.value
}

function isLiteral(node) {
  const expression = unwrapExpression(node)
  return Boolean(expression && expression.type === 'Literal')
}

function isBooleanLiteral(node) {
  return typeof getStaticLiteralValue(node) === 'boolean'
}

function isNullishLiteral(node) {
  const expression = unwrapExpression(node)
  if (!expression) return false
  if (expression.type === 'Identifier') return expression.name === 'undefined'
  if (expression.type !== 'Literal') return false
  return nullishValues.has(expression.value)
}

function isSimpleNullishComparison(node) {
  const expression = unwrapExpression(node)
  if (!expression || expression.type !== 'BinaryExpression') return false
  if (!['==', '===', '!=', '!=='].includes(expression.operator)) return false
  return isNullishLiteral(expression.left) || isNullishLiteral(expression.right)
}

function isPredicateName(name) {
  return predicatePrefixes.some(prefix =>
    name.startsWith(prefix) &&
    name.length > prefix.length &&
    name[prefix.length] === name[prefix.length].toUpperCase()
  )
}

function isArrayMethodCall(node) {
  const expression = unwrapExpression(node)
  if (!expression || expression.type !== 'CallExpression') return false
  if (expression.callee.type !== 'MemberExpression') return false

  const methodName = getPropertyName(expression.callee.property)
  return proseArrayMethods.includes(methodName)
}

function isBooleanishExpression(node) {
  const expression = unwrapExpression(node)
  if (!expression) return false

  switch (expression.type) {
    case 'Literal':
      return typeof expression.value === 'boolean'
    case 'UnaryExpression':
      return ['!', 'delete'].includes(expression.operator)
    case 'BinaryExpression':
      return true
    case 'LogicalExpression':
      return true
    case 'CallExpression': {
      const name = getCalleeName(expression.callee)
      return name === 'Boolean' || isPredicateName(name || '')
    }
    default:
      return false
  }
}
