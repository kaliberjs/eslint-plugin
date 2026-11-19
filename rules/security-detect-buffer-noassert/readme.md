# Detect Buffer noAssert usage

Detects Buffer read/write calls with the `noAssert` flag set to `true`, which skips bounds validation. When `noAssert` is enabled, Node.js will not verify that the offset is within the buffer's bounds, which can lead to out-of-bounds memory access, data corruption, or crashes.

## Examples

Examples of *correct* code for this rule:

```js
buf.readUInt8(0)
buf.writeUInt16LE(value, 0)
buf.readUInt8(0, false)
```

Examples of *incorrect* code for this rule:

```js
buf.readUInt8(0, true)
buf.writeUInt32LE(value, 0, true)
buf.readInt16BE(0, true)
```
