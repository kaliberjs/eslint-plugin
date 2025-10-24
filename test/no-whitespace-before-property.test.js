const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-whitespace-before-property) should report an error for whitespace before property', async () => {
  const result = await lint(`const a = a .b;`)
  assertHasWarning(result, 'no-whitespace-before-property')
})
