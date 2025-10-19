const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(quotes) should report an error for double quotes', async () => {
  const result = await lint(`const a = "hello";`)
  assertHasWarning(result, 'quotes')
})
