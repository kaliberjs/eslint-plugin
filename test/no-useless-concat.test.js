const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-useless-concat) should report an error for useless concat', async () => {
  const result = await lint(`const a = "a" + "b";`)
  assertHasWarning(result, 'no-useless-concat')
})
