const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(rest-spread-spacing) should report an error for space after spread', async () => {
  const result = await lint(`const a = [... a];`)
  assertHasWarning(result, 'rest-spread-spacing')
})
