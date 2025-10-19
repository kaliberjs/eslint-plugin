const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(radix) should report an error for missing radix in parseInt', async () => {
  const result = await lint(`parseInt('10');`)
  assertHasWarning(result, 'radix')
})
