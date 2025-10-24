const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-unneeded-ternary) should report an error for unneeded ternary', async () => {
  const result = await lint(`const a = x ? true : false;`)
  assertHasWarning(result, 'no-unneeded-ternary')
})
