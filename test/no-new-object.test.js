const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-new-object) should report an error for new Object', async () => {
  const result = await lint(`const a = new Object();`)
  assertHasWarning(result, 'no-new-object')
})
