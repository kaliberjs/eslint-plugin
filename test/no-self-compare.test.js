const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-self-compare) should report an error for self comparison', async () => {
  const result = await lint(`if (a === a) {}`)
  assertHasWarning(result, 'no-self-compare')
})
