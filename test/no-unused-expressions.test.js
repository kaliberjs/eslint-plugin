const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-unused-expressions) should report an error for unused expressions', async () => {
  const result = await lint(`0;`)
  assertHasWarning(result, 'no-unused-expressions')
})
