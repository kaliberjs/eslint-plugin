const docsUrl = require('../../machinery/docsUrl')

const BUFFER_METHODS = [
  'readUInt8', 'readUInt16LE', 'readUInt16BE', 'readUInt32LE', 'readUInt32BE',
  'readInt8', 'readInt16LE', 'readInt16BE', 'readInt32LE', 'readInt32BE',
  'readFloatLE', 'readFloatBE', 'readDoubleLE', 'readDoubleBE',
  'writeUInt8', 'writeUInt16LE', 'writeUInt16BE', 'writeUInt32LE', 'writeUInt32BE',
  'writeInt8', 'writeInt16LE', 'writeInt16BE', 'writeInt32LE', 'writeInt32BE',
  'writeFloatLE', 'writeFloatBE', 'writeDoubleLE', 'writeDoubleBE',
]

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects Buffer read/write calls with noAssert flag set to true, which skips bounds validation',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages: {
      bufferNoassert: '{{method}}() called with noAssert flag — this skips bounds validation and can cause out-of-bounds access',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          BUFFER_METHODS.includes(node.callee.property.name)
        ) {
          const lastArg = node.arguments[node.arguments.length - 1]
          if (lastArg && lastArg.type === 'Literal' && lastArg.value === true) {
            context.report({
              node,
              messageId: 'bufferNoassert',
              data: { method: node.callee.property.name },
            })
          }
        }
      },
    }
  },
}
