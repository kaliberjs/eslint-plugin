const docsUrl = require('../../machinery/docsUrl')
const {
  isBooleanishExpression,
  predicatePrefixes,
  unwrapExpression,
} = require('../../machinery/prose/ast')

const messages = {
  predicateName:
    "Boolean intent should read as a question. Rename '{{name}}' to start with one of: {{prefixes}}.",
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require obvious boolean helpers and values to use predicate names',
      url: docsUrl(__dirname),
    },
    schema: [
      {
        type: 'object',
        properties: {
          prefixes: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
          },
        },
        additionalProperties: false,
      },
    ],
    messages,
  },

  create(context) {
    const options = context.options[0] || {}
    const prefixes = options.prefixes || predicatePrefixes

    return {
      FunctionDeclaration(node) {
        if (!node.id) return
        reportInvalidPredicateName(node.id, node)
      },
      VariableDeclarator(node) {
        if (node.id.type !== 'Identifier') return

        const init = unwrapExpression(node.init)
        if (isFunction(init)) {
          reportInvalidPredicateName(node.id, init)
          return
        }

        if (!isBooleanishExpression(init)) return
        reportName(node.id)
      },
      Property(node) {
        const value = unwrapExpression(node.value)
        if (!isFunction(value)) return
        if (node.key.type !== 'Identifier' && node.key.type !== 'Literal') return
        if (!returnsBooleanishValue(value)) return

        reportName(node.key)
      },
      MethodDefinition(node) {
        const value = unwrapExpression(node.value)
        if (!isFunction(value)) return
        if (!returnsBooleanishValue(value)) return

        reportName(node.key)
      },
    }

    function reportInvalidPredicateName(identifier, functionNode) {
      if (!returnsBooleanishValue(functionNode)) return
      reportName(identifier)
    }

    function reportName(node) {
      const name = getName(node)
      if (!name || hasAllowedPrefix(name, prefixes)) return

      context.report({
        node,
        messageId: 'predicateName',
        data: {
          name,
          prefixes: prefixes.join(', '),
        },
      })
    }
  },
}

function returnsBooleanishValue(functionNode) {
  if (!functionNode) return false
  if (functionNode.type === 'ArrowFunctionExpression' && functionNode.body.type !== 'BlockStatement')
    return isBooleanishExpression(functionNode.body)

  const returnArgs = getReturnArguments(functionNode.body)
    .filter(arg => arg != null)
  if (returnArgs.length === 0) return false
  return returnArgs.every(isBooleanishExpression)
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

function getName(node) {
  if (!node) return null
  if (node.type === 'Identifier') return node.name
  if (node.type === 'Literal') return String(node.value)
  return null
}

function hasAllowedPrefix(name, prefixes) {
  return prefixes.some(prefix =>
    name.startsWith(prefix) &&
    name.length > prefix.length &&
    name[prefix.length] === name[prefix.length].toUpperCase()
  )
}
