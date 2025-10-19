const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(space-before-function-paren) should report an error for space before function paren', async () => {
  const result = await lint(`function foo () {}`)
  assertHasWarning(result, 'space-before-function-paren')
})
