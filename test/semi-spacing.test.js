const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(semi-spacing) should report an error for space before semicolon', async () => {
  const result = await lint(`const a = 1 ;`)
  assertHasWarning(result, 'semi-spacing')
})
