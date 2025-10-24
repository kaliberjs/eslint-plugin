const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-obj-calls) should report an error for calling Math as a function', async () => {
  const result = await lint(`const math = Math();`)
  assertHasWarning(result, 'no-obj-calls')
})
