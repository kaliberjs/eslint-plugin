const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-undef) should report an error for undefined variables', async () => {
  const result = await lint(`a = 1;`)
  assertHasWarning(result, 'no-undef')
})
