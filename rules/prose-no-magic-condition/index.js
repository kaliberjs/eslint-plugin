const docsUrl = require('../../machinery/docsUrl')
const {
  isBooleanLiteral,
  isLiteral,
  isNullishLiteral,
  unwrapExpression,
} = require('../../machinery/prose/ast')

const messages = {
  magicCondition:
    'Avoid literal values in conditions. Extract the business meaning into a named predicate or constant.',
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow magic string, number, and regexp literals in condition expressions',
      url: docsUrl(__dirname),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allow: {
            type: 'array',
            items: {},
          },
          ignoreBoolean: { type: 'boolean' },
          ignoreNullish: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages,
  },

  create(context) {
    const options = context.options[0] || {}
    const allowedValues = new Set(options.allow || [])
    const ignoreBoolean = options.ignoreBoolean !== false
    const ignoreNullish = options.ignoreNullish !== false

    return {
      IfStatement: node => reportMagicLiterals(node.test),
      ConditionalExpression: node => reportMagicLiterals(node.test),
      WhileStatement: node => reportMagicLiterals(node.test),
      DoWhileStatement: node => reportMagicLiterals(node.test),
      ForStatement(node) {
        if (node.test) reportMagicLiterals(node.test)
      },
    }

    function reportMagicLiterals(node) {
      for (const literal of getMagicLiterals(node)) {
        context.report({
          node: literal,
          messageId: 'magicCondition',
        })
      }
    }

    function getMagicLiterals(node, parent = null) {
      const expression = unwrapExpression(node)
      if (!expression) return []
      if (isSkippablePropertyKey(expression, parent)) return []
      if (isMagicLiteral(expression)) return [expression]

      return Object.entries(expression).flatMap(([key, value]) => {
        if (key === 'parent') return []
        if (!value) return []
        if (Array.isArray(value)) return value.flatMap(child => getMagicLiterals(child, expression))
        if (typeof value === 'object' && typeof value.type === 'string')
          return getMagicLiterals(value, expression)
        return []
      })
    }

    function isMagicLiteral(node) {
      if (!isLiteral(node)) return false
      if (ignoreNullish && isNullishLiteral(node)) return false
      if (ignoreBoolean && isBooleanLiteral(node)) return false
      if (allowedValues.has(node.value)) return false

      return (
        typeof node.value === 'number' ||
        typeof node.value === 'string' ||
        typeof node.value === 'bigint' ||
        Boolean(node.regex)
      )
    }
  },
}

function isSkippablePropertyKey(node, parent) {
  return (
    parent &&
    parent.type === 'Property' &&
    parent.key === node &&
    !parent.computed
  )
}
