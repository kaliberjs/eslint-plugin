const docsUrl = require('../../machinery/docsUrl')
const { getPropertyName, unwrapExpression } = require('../../machinery/prose/ast')

const messages = {
  namedReducer:
    'Extract this reducer into a named function so the aggregation reads as intent.',
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require complex reduce callbacks to be named functions',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages,
  },

  create(context) {
    return {
      CallExpression(node) {
        if (!isReduceCall(node)) return

        const [callback] = node.arguments
        if (!isInlineFunction(callback)) return
        if (isSimpleScalarReducer(callback)) return

        context.report({
          node: callback,
          messageId: 'namedReducer',
        })
      },
    }
  },
}

function isReduceCall(node) {
  if (node.callee.type !== 'MemberExpression') return false
  const name = getPropertyName(node.callee.property)
  return name === 'reduce' && node.arguments.length >= 1
}

function isInlineFunction(node) {
  if (!node) return false
  const expression = unwrapExpression(node)
  return (
    expression.type === 'ArrowFunctionExpression' ||
    expression.type === 'FunctionExpression'
  )
}

function isSimpleScalarReducer(callback) {
  const body = getReducerBody(callback)
  if (!body) return false
  return isSimpleBinaryAccumulation(body, callback)
}

function getReducerBody(callback) {
  const fn = unwrapExpression(callback)
  if (!fn) return null
  if (fn.body.type !== 'BlockStatement') return fn.body

  const statements = fn.body.body.filter(s => s.type !== 'EmptyStatement')
  if (statements.length !== 1) return null
  const [statement] = statements
  return statement.type === 'ReturnStatement' ? statement.argument : null
}

function isSimpleBinaryAccumulation(node, callback) {
  const expression = unwrapExpression(node)
  if (!expression || expression.type !== 'BinaryExpression') return false
  if (!['+', '-', '*', '/'].includes(expression.operator)) return false

  const accName = getAccumulatorName(callback)
  if (!accName) return false

  return referencesName(expression.left, accName) || referencesName(expression.right, accName)
}

function getAccumulatorName(callback) {
  const fn = unwrapExpression(callback)
  if (!fn || !fn.params || fn.params.length < 2) return null
  const first = fn.params[0]
  return first.type === 'Identifier' ? first.name : null
}

function referencesName(node, name) {
  const expression = unwrapExpression(node)
  if (!expression) return false
  if (expression.type === 'Identifier') return expression.name === name
  if (expression.type === 'MemberExpression') return referencesName(expression.object, name)
  return false
}
