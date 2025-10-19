const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-sparse-arrays) should report an error for sparse arrays', async () => {
  const result = await lint(`const a = [1, , 2];`)
  assertHasWarning(result, 'no-sparse-arrays')
})
