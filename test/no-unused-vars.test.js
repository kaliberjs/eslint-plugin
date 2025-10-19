const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-unused-vars) should report an error for unused variables', async () => {
  const result = await lint(`const a = 1;`)
  assertHasWarning(result, 'no-unused-vars')
})
