const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-new-func) should report an error for new Function', async () => {
  const result = await lint(`const a = new Function('a', 'b', 'return a + b');`)
  assertHasWarning(result, 'no-new-func')
})
