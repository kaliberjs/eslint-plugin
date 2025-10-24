const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-script-url) should report an error for using javascript: urls', async () => {
  const result = await lint(`location.href = 'javascript:void(0)';`)
  assertHasWarning(result, 'no-script-url')
})
