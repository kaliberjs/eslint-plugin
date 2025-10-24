const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-useless-computed-key) should report an error for useless computed key', async () => {
  const result = await lint(`const a = { ['a']: 1 };`)
  assertHasWarning(result, 'no-useless-computed-key')
})
