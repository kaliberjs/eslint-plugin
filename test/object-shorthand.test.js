const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(object-shorthand) should report an error for longhand property', async () => {
  const result = await lint(`const obj = { a: a };`)
  assertHasWarning(result, 'object-shorthand')
})
