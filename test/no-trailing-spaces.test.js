const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-trailing-spaces) should report an error for trailing spaces', async () => {
  const result = await lint(`const a = 1; `)
  assertHasWarning(result, 'no-trailing-spaces')
})
