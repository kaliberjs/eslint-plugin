const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-mixed-operators) should report an error for mixed operators', async () => {
  const result = await lint(`const a = 1 + 2 * 3;`)
  assertHasWarning(result, 'no-mixed-operators')
})
