const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-restricted-properties) should report an error for using a restricted property', async () => {
  const result = await lint(`require.ensure(['a'], () => {});`)
  assertHasWarning(result, 'no-restricted-properties')
})
