const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(space-unary-ops) should report an error for space after unary operator', async () => {
  const result = await lint(`const a = ! a;`)
  assertHasWarning(result, 'space-unary-ops')
})
