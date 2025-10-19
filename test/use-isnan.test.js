const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(use-isnan) should report an error for comparing with NaN', async () => {
  const result = await lint(`if (a === NaN) {}`)
  assertHasWarning(result, 'use-isnan')
})
