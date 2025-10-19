const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-restricted-globals) should report an error for using a restricted global', async () => {
  const result = await lint(`event;`)
  assertHasWarning(result, 'no-restricted-globals')
})
