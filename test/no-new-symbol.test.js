const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-new-symbol) should report an error for new Symbol', async () => {
  const result = await lint(`const a = new Symbol('foo');`)
  assertHasWarning(result, 'no-new-symbol')
})
