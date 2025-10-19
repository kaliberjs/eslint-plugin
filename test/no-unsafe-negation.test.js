const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-unsafe-negation) should report an error for unsafe negation', async () => {
  const result = await lint(`if (!key in object) {}`)
  assertHasWarning(result, 'no-unsafe-negation')
})
