const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-shadow-restricted-names) should report an error for shadowing restricted names', async () => {
  const result = await lint(`function undefined() {}`)
  assertHasWarning(result, 'no-shadow-restricted-names')
})
