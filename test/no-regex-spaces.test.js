const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-regex-spaces) should report an error for multiple spaces in regex', async () => {
  const result = await lint(`const a = /hello  world/;`)
  assertHasWarning(result, 'no-regex-spaces')
})
