const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-unused-labels) should report an error for unused labels', async () => {
  const result = await lint(`A: var a = 0;`)
  assertHasWarning(result, 'no-unused-labels')
})
