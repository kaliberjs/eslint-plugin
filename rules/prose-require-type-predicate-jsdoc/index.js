const docsUrl = require('../../machinery/docsUrl')
const {
  getPropertyName,
  isPredicateName,
  unwrapExpression,
} = require('../../machinery/prose/ast')

const discriminantPropertyNames = new Set(['_type', 'kind', 'nodeType', 'tagName', 'type'])

const messages = {
  missingTypePredicateJsdoc:
    "Type predicate function '{{name}}' should have JSDoc with @returns {paramName is TypeName}.",
  missingTypePredicateReturn:
    "Type predicate function '{{name}}' has JSDoc but is missing @returns {paramName is TypeName}.",
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require type predicate JSDoc on predicate-named type guards',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages,
  },

  create(context) {
    const sourceCode = context.sourceCode

    return {
      FunctionDeclaration(node) {
        if (!node.id) return
        checkFunction(node.id.name, node)
      },
      VariableDeclarator(node) {
        if (node.id.type !== 'Identifier') return

        const init = unwrapExpression(node.init)
        if (!isFunction(init)) return

        checkFunction(node.id.name, node)
      },
    }

    function checkFunction(name, node) {
      if (!isPredicateName(name)) return

      const functionNode = node.type === 'VariableDeclarator'
        ? unwrapExpression(node.init)
        : node

      if (!hasParameters(functionNode)) return
      if (!returnsTypeGuardishValue(functionNode)) return

      const commentTarget = node.type === 'VariableDeclarator'
        ? node.parent
        : node

      const jsdocComment = getJSDocComment(sourceCode, commentTarget)
      const reportNode = node.type === 'VariableDeclarator' ? node.id : node.id || node

      if (!jsdocComment) {
        context.report({
          node: reportNode,
          messageId: 'missingTypePredicateJsdoc',
          data: { name },
        })
        return
      }

      if (!hasValidTypePredicateReturn(jsdocComment.value, functionNode)) {
        context.report({
          node: reportNode,
          messageId: 'missingTypePredicateReturn',
          data: { name },
        })
      }
    }
  },
}

function returnsTypeGuardishValue(functionNode) {
  const parameterNames = getParameterNames(functionNode)
  return getReturnedExpressions(functionNode)
    .some(expression => isTypeGuardishExpression(expression, parameterNames))
}

function getParameterNames(functionNode) {
  return new Set(
    functionNode.params
      .map(getParameterName)
      .filter(Boolean)
  )
}

function getParameterName(parameter) {
  const expression = unwrapExpression(parameter)
  if (!expression) return null
  if (expression.type === 'Identifier') return expression.name
  if (expression.type === 'AssignmentPattern') return getParameterName(expression.left)
  return null
}

function getReturnedExpressions(functionNode) {
  if (
    functionNode.type === 'ArrowFunctionExpression' &&
    functionNode.body.type !== 'BlockStatement'
  ) return [functionNode.body]

  return getReturnArguments(functionNode.body)
}

function getReturnArguments(node) {
  if (!node) return []
  if (node.type === 'ReturnStatement') return [node.argument]
  if (isFunction(node)) return []

  return Object.entries(node).flatMap(([key, value]) => {
    if (key === 'parent') return []
    if (!value) return []
    if (Array.isArray(value)) return value.flatMap(getReturnArguments)
    if (typeof value === 'object' && typeof value.type === 'string')
      return getReturnArguments(value)
    return []
  })
}

function isTypeGuardishExpression(node, parameterNames) {
  const expression = unwrapExpression(node)
  if (!expression) return false

  switch (expression.type) {
    case 'CallExpression':
      return isBooleanWrapperCall(expression) &&
        expression.arguments.some(argument => isTypeGuardishExpression(argument, parameterNames))
    case 'LogicalExpression':
      return (
        isTypeGuardishExpression(expression.left, parameterNames) ||
        isTypeGuardishExpression(expression.right, parameterNames)
      )
    case 'UnaryExpression':
      return expression.operator === '!' &&
        isTypeGuardishExpression(expression.argument, parameterNames)
    case 'BinaryExpression':
      return isTypeGuardishBinaryExpression(expression, parameterNames)
    default:
      return false
  }
}

function isBooleanWrapperCall(node) {
  const callee = unwrapExpression(node.callee)
  return Boolean(callee && callee.type === 'Identifier' && callee.name === 'Boolean')
}

function isTypeGuardishBinaryExpression(node, parameterNames) {
  if (isTypeofParameterComparison(node, parameterNames)) return true
  if (isInstanceofParameterComparison(node, parameterNames)) return true
  if (isPropertyInParameterComparison(node, parameterNames)) return true
  return isDiscriminantPropertyComparison(node, parameterNames)
}

function isTypeofParameterComparison(node, parameterNames) {
  if (!['==', '===', '!=', '!=='].includes(node.operator)) return false

  return (
    isTypeofParameter(node.left, parameterNames) &&
    isLiteral(node.right)
  ) || (
    isTypeofParameter(node.right, parameterNames) &&
    isLiteral(node.left)
  )
}

function isTypeofParameter(node, parameterNames) {
  const expression = unwrapExpression(node)
  return Boolean(
    expression &&
    expression.type === 'UnaryExpression' &&
    expression.operator === 'typeof' &&
    referencesParameter(expression.argument, parameterNames)
  )
}

function isInstanceofParameterComparison(node, parameterNames) {
  return node.operator === 'instanceof' &&
    referencesParameter(node.left, parameterNames)
}

function isPropertyInParameterComparison(node, parameterNames) {
  return node.operator === 'in' &&
    isLiteral(node.left) &&
    referencesParameter(node.right, parameterNames)
}

function isDiscriminantPropertyComparison(node, parameterNames) {
  if (!['==', '===', '!=', '!=='].includes(node.operator)) return false

  return (
    isDiscriminantPropertyAccess(node.left, parameterNames) &&
    isLiteral(node.right)
  ) || (
    isDiscriminantPropertyAccess(node.right, parameterNames) &&
    isLiteral(node.left)
  )
}

function isDiscriminantPropertyAccess(node, parameterNames) {
  const expression = unwrapExpression(node)
  if (!expression || expression.type !== 'MemberExpression') return false
  if (!referencesParameter(expression.object, parameterNames)) return false

  return discriminantPropertyNames.has(getPropertyName(expression.property))
}

function referencesParameter(node, parameterNames) {
  const expression = unwrapExpression(node)
  if (!expression) return false

  if (expression.type === 'Identifier') return parameterNames.has(expression.name)
  if (expression.type === 'MemberExpression') return referencesParameter(expression.object, parameterNames)

  return false
}

function isLiteral(node) {
  const expression = unwrapExpression(node)
  return Boolean(expression && expression.type === 'Literal')
}

function isFunction(node) {
  return Boolean(
    node &&
    [
      'FunctionDeclaration',
      'FunctionExpression',
      'ArrowFunctionExpression',
    ].includes(node.type)
  )
}

function hasParameters(node) {
  return node && node.params && node.params.length > 0
}

function getJSDocComment(sourceCode, node) {
  const comments = sourceCode.getCommentsBefore(node)
  if (!comments.length) return null

  const last = comments[comments.length - 1]
  if (last.type !== 'Block' || !last.value.startsWith('*')) return null

  const commentEnd = last.loc.end.line
  const nodeStart = node.loc.start.line
  if (nodeStart - commentEnd > 1) return null

  return last
}

function hasValidTypePredicateReturn(commentText, functionNode) {
  const match = commentText.match(/@returns?\s*\{(\w+)\s+is\s+\S[^}]*\}/)
  if (!match) return false
  const subject = match[1]
  const paramNames = getParameterNames(functionNode)
  return paramNames.has(subject)
}
