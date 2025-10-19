const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(unicode-bom) should report an error for unicode BOM', async () => {
  const result = await lint(`\uFEFFconst a = 1;`)
  assertHasWarning(result, 'unicode-bom')
})
