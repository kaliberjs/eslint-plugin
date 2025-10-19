const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-negated-in-lhs) should report an error for negated in lhs', async () => {
  const result = await lint(`if (!key in object) {}`)
  assertHasWarning(result, 'no-negated-in-lhs')
})
