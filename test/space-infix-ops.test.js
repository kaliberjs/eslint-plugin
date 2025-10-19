const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(space-infix-ops) should report an error for no space around infix ops', async () => {
  const result = await lint(`const a = 1+2;`)
  assertHasWarning(result, 'space-infix-ops')
})
