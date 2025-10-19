const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(valid-typeof) should report an error for invalid typeof', async () => {
  const result = await lint(`typeof a === 'stringg'`)
  assertHasWarning(result, 'valid-typeof')
})
