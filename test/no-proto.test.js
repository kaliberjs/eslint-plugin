const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-proto) should report an error for using __proto__', async () => {
  const result = await lint(`const a = {}.__proto__;`)
  assertHasWarning(result, 'no-proto')
})
