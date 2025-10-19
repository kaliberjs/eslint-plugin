const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(space-before-blocks) should report an error for no space before blocks', async () => {
  const result = await lint(`function foo(){}`)
  assertHasWarning(result, 'space-before-blocks')
})
