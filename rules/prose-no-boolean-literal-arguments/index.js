const docsUrl = require('../../machinery/docsUrl')
const {
  getCalleeName,
  isBooleanLiteral,
} = require('../../machinery/prose/ast')

const defaultAllowCallees = [
  'Boolean',
  'assert',
  'assert.ok',
  'assert.equal',
  'assert.strictEqual',
  'assert.deepEqual',
  'assert.deepStrictEqual',
  'expect.toBe',
  'expect.toEqual',
  'expect.toStrictEqual',
  'Promise.resolve',
  'Promise.reject',
  'resolve',
  'reject',
]

const messages = {
  booleanLiteralArgument:
    'Avoid bare boolean arguments. Use a named options object so the call site explains what the boolean means.',
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow bare true/false arguments at call sites',
      url: docsUrl(__dirname),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowCallees: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
    messages,
  },

  create(context) {
    const options = context.options[0] || {}
    const allowCallees = new Set([...defaultAllowCallees, ...(options.allowCallees || [])])

    return {
      CallExpression: reportBooleanLiteralArguments,
      NewExpression: reportBooleanLiteralArguments,
    }

    function reportBooleanLiteralArguments(node) {
      const calleeName = getCalleeName(node.callee)
      if (calleeName && allowCallees.has(calleeName)) return
      if (isSingleBooleanSetterCall(node, isBooleanLiteral)) return

      for (const argument of node.arguments) {
        if (!isBooleanLiteral(argument)) continue

        context.report({
          node: argument,
          messageId: 'booleanLiteralArgument',
        })
      }
    }
  },
}

function isSingleBooleanSetterCall(node, isBooleanLiteralFn) {
  if (node.arguments.length !== 1) return false
  if (!isBooleanLiteralFn(node.arguments[0])) return false
  const name = getCalleeName(node.callee)
  return Boolean(name && /^set[A-Z]/.test(name))
}
