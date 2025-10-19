const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-use-before-define) should report an error for using a variable before it is defined', async () => {
  const result = await lint(`a = 1; let a;`)
  assertHasWarning(result, 'no-use-before-define')
})
