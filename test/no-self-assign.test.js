const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-self-assign) should report an error for self assignment', async () => {
  const result = await lint(`a = a;`)
  assertHasWarning(result, 'no-self-assign')
})
