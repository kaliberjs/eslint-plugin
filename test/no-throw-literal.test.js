const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-throw-literal) should report an error for throwing a literal', async () => {
  const result = await lint(`throw "error";`)
  assertHasWarning(result, 'no-throw-literal')
})
