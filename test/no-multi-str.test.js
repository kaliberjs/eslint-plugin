const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-multi-str) should report an error for multi-line strings', async () => {
  const result = await lint(`const a = "hello \\
    world";`)
  assertHasWarning(result, 'no-multi-str')
})
