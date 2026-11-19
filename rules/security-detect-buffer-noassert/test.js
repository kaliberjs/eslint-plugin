const { test } = require('../../machinery/test')

test('security-detect-buffer-noassert', {
  valid: [
    // No arguments — no noAssert flag
    `buf.readUInt8()`,
    `buf.readInt8()`,

    // false as last arg — safe
    `buf.readUInt8(0, false)`,
    `buf.readUInt16LE(0, false)`,
    `buf.readUInt16BE(0, false)`,
    `buf.readUInt32LE(0, false)`,
    `buf.readUInt32BE(0, false)`,
    `buf.readInt8(0, false)`,
    `buf.readInt16LE(0, false)`,
    `buf.readInt16BE(0, false)`,
    `buf.readInt32LE(0, false)`,
    `buf.readInt32BE(0, false)`,
    `buf.readFloatLE(0, false)`,
    `buf.readFloatBE(0, false)`,
    `buf.readDoubleLE(0, false)`,
    `buf.readDoubleBE(0, false)`,
    `buf.writeUInt8(1, 0, false)`,
    `buf.writeInt8(1, 0, false)`,

    // Only offset, no noAssert
    `buf.readUInt8(0)`,
    `buf.readUInt16LE(4)`,
    `buf.writeUInt8(0xFF, 0)`,
    `buf.writeInt32LE(42, 4)`,

    // Last arg is not true (number, string, null, undefined, variable)
    `buf.readUInt8(0, 0)`,
    `buf.readUInt8(0, 'yes')`,
    `buf.readUInt8(0, null)`,
    `buf.readUInt8(0, undefined)`,
    `buf.readUInt8(0, noAssert)`,

    // Not a buffer method — different method name
    `buf.toString()`,
    `buf.slice(0, 10)`,
    `buf.copy(target, 0, 0, 10)`,
    `buf.fill(0)`,
    `obj.someMethod(true)`,
    `arr.push(true)`,

    // Standalone function call, not a member expression
    `readUInt8(0, true)`,
    `writeUInt8(1, 0, true)`,

    // Computed property access — callee.property.type !== 'Identifier'
    `buf['readUInt8'](0, true)`,
  ],

  invalid: [
    // Read methods with noAssert = true
    {
      code: `buf.readUInt8(0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
    {
      code: `buf.readUInt16LE(0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
    {
      code: `buf.readUInt16BE(0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
    {
      code: `buf.readUInt32LE(0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
    {
      code: `buf.readUInt32BE(0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
    {
      code: `buf.readInt8(0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
    {
      code: `buf.readInt16LE(0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
    {
      code: `buf.readInt16BE(0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
    {
      code: `buf.readInt32LE(0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
    {
      code: `buf.readInt32BE(0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
    {
      code: `buf.readFloatLE(0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
    {
      code: `buf.readFloatBE(0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
    {
      code: `buf.readDoubleLE(0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
    {
      code: `buf.readDoubleBE(0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },

    // Write methods with noAssert = true
    {
      code: `buf.writeUInt8(0xFF, 0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
    {
      code: `buf.writeUInt16LE(256, 0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
    {
      code: `buf.writeUInt16BE(256, 0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
    {
      code: `buf.writeUInt32LE(100000, 0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
    {
      code: `buf.writeUInt32BE(100000, 0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
    {
      code: `buf.writeInt8(-1, 0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
    {
      code: `buf.writeInt16LE(-1, 0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
    {
      code: `buf.writeInt16BE(-1, 0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
    {
      code: `buf.writeInt32LE(-1, 0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
    {
      code: `buf.writeInt32BE(-1, 0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
    {
      code: `buf.writeFloatLE(1.5, 0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
    {
      code: `buf.writeFloatBE(1.5, 0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
    {
      code: `buf.writeDoubleLE(3.14, 0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
    {
      code: `buf.writeDoubleBE(3.14, 0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },

    // true as only arg
    {
      code: `buf.readUInt8(true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },

    // Chained member expression
    {
      code: `this.buffer.readUInt32LE(0, true)`,
      errors: [{ messageId: 'bufferNoassert' }],
    },

    // Nested call
    {
      code: `process(buf.readInt16BE(offset, true))`,
      errors: [{ messageId: 'bufferNoassert' }],
    },
  ],
})
