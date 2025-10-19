const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(object-curly-spacing) should report an error for no space inside curly braces', async () => {
  const result = await lint(`const obj = {a: 1};`)
  assertHasWarning(result, 'object-curly-spacing')
})
