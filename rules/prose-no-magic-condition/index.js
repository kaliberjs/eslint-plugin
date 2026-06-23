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
      description: 'Disallow magic number, regexp, and (optionally) string literals in condition expressions',
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
          allowStructural: { type: 'boolean' },
          ignoreBoolean: { type: 'boolean' },
          ignoreNullish: { type: 'boolean' },
          ignoreTypeof: { type: 'boolean' },
          ignoreStringLiterals: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages,
  },

  create(context) {
    const options = context.options[0] || {}
    const allowStructural = options.allowStructural !== false
    const structuralValues = allowStructural ? [0, 1, -1] : []
    const allowedValues = new Set([...structuralValues, ...(options.allow || [])])
    const ignoreBoolean = options.ignoreBoolean !== false
    const ignoreNullish = options.ignoreNullish !== false
    const ignoreTypeof = options.ignoreTypeof !== false
    const ignoreStringLiterals = options.ignoreStringLiterals !== false

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
      if (isTypeofComparisonLiteral(expression, parent)) {
        if (ignoreTypeof) return []
        if (!allowedValues.has(expression.value)) return [expression]
        return []
      }
      if (isStaticTemplateLiteral(expression)) {
        if (ignoreStringLiterals) return []
        const value = expression.quasis[0].value.cooked
        if (!allowedValues.has(value)) return [expression]
        return []
      }
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
      if (allowedValues.has(node.value)) return false
      if (isNullishLiteral(node)) return !ignoreNullish
      if (isBooleanLiteral(node)) return !ignoreBoolean

      return (
        typeof node.value === 'number' ||
        (typeof node.value === 'string' && !ignoreStringLiterals) ||
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

function isTypeofComparisonLiteral(node, parent) {
  if (!parent || parent.type !== 'BinaryExpression') return false
  if (!['==', '===', '!=', '!=='].includes(parent.operator)) return false

  return (
    parent.left === node &&
    isTypeofExpression(parent.right)
  ) || (
    parent.right === node &&
    isTypeofExpression(parent.left)
  )
}

function isTypeofExpression(node) {
  const expression = unwrapExpression(node)
  return Boolean(
    expression &&
    expression.type === 'UnaryExpression' &&
    expression.operator === 'typeof'
  )
}

function isStaticTemplateLiteral(node) {
  const expression = unwrapExpression(node)
  return Boolean(
    expression &&
    expression.type === 'TemplateLiteral' &&
    expression.expressions.length === 0
  )
}
