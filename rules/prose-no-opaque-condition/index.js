const docsUrl = require('../../machinery/docsUrl')
const {
  getCalleeName,
  getIdentifierName,
  getMemberExpressionDepth,
  isPredicateName,
  isSimpleNullishComparison,
  unwrapExpression,
} = require('../../machinery/prose/ast')

const messages = {
  opaqueCondition:
    'Extract this condition into a named predicate so the branch reads as intent instead of implementation.',
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require complex conditions to be named predicates',
      url: docsUrl(__dirname),
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxLength: {
            type: 'integer',
            minimum: 1,
          },
          maxNamedPredicateClauses: {
            type: 'integer',
            minimum: 1,
          },
        },
        additionalProperties: false,
      },
    ],
    messages,
  },

  create(context) {
    const sourceCode = context.sourceCode
    const options = context.options[0] || {}
    const maxLength = options.maxLength || 60
    const maxNamedPredicateClauses = options.maxNamedPredicateClauses || 2

    return {
      IfStatement: node => reportOpaqueCondition(node.test),
      ConditionalExpression: node => reportOpaqueCondition(node.test),
      WhileStatement: node => reportOpaqueCondition(node.test),
      DoWhileStatement: node => reportOpaqueCondition(node.test),
      ForStatement(node) {
        if (node.test) reportOpaqueCondition(node.test)
      },
    }

    function reportOpaqueCondition(test) {
      if (!isOpaqueCondition(test)) return

      context.report({
        node: test,
        messageId: 'opaqueCondition',
      })
    }

    function isOpaqueCondition(test) {
      const expression = unwrapExpression(test)
      if (!expression) return false
      if (isReadableCondition(expression)) return false
      if (sourceCode.getText(expression).length > maxLength) return true
      if (expression.type === 'LogicalExpression')
        return isOpaqueLogicalExpression(expression)
      if (expression.type === 'BinaryExpression')
        return !isSimpleNullishComparison(expression)
      if (expression.type === 'UnaryExpression')
        return isOpaqueUnaryExpression(expression)

      return hasNestedMemberExpression(expression)
    }

    function isOpaqueLogicalExpression(node) {
      const clauses = getLogicalClauses(node)
      if (clauses.length > maxNamedPredicateClauses) return true
      return clauses.some(clause => !isReadableCondition(clause))
    }
  },
}

function isReadableCondition(node) {
  const expression = unwrapExpression(node)
  if (!expression) return false
  if (isSimpleNullishComparison(expression)) return true

  switch (expression.type) {
    case 'Identifier':
      return true
    case 'MemberExpression':
      return getMemberExpressionDepth(expression) <= 1
    case 'CallExpression':
      return isReadablePredicateCall(expression)
    case 'UnaryExpression':
      return isReadableUnaryExpression(expression)
    default:
      return false
  }
}

function isReadablePredicateCall(node) {
  const name = getCalleeName(node.callee)
  return Boolean(name && isPredicateName(name.split('.').pop()))
}

function isReadableUnaryExpression(node) {
  if (node.operator !== '!') return false

  const argument = unwrapExpression(node.argument)
  return Boolean(
    getIdentifierName(argument) ||
    (
      argument &&
      argument.type === 'CallExpression' &&
      isReadablePredicateCall(argument)
    )
  )
}

function isOpaqueUnaryExpression(node) {
  if (node.operator !== '!') return false
  return !isReadableUnaryExpression(node)
}

function getLogicalClauses(node) {
  const expression = unwrapExpression(node)
  if (!expression || expression.type !== 'LogicalExpression') return [expression]

  return [
    ...getLogicalClauses(expression.left),
    ...getLogicalClauses(expression.right),
  ]
}

function hasNestedMemberExpression(node) {
  const expression = unwrapExpression(node)
  if (!expression) return false
  if (getMemberExpressionDepth(expression) > 1) return true

  return getChildNodes(expression).some(hasNestedMemberExpression)
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
