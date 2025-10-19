const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(semi) should report an error for using a semicolon', async () => {
  const result = await lint(`const a = 1;`)
  assertHasWarning(result, 'semi')
})
