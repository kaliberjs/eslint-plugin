const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-new-wrappers) should report an error for new String', async () => {
  const result = await lint(`const a = new String('hello');`)
  assertHasWarning(result, 'no-new-wrappers')
})
