const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(comma-dangle) should report an error for trailing comma in single line', async () => {
  const result = await lint(`const a = [1,];`)
  assertHasWarning(result, 'comma-dangle')
})
