const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(jsx-a11y/no-access-key) should report an error for using accessKey', async () => {
  const result = await lint(`<div accessKey="a"></div>`)
  assertHasWarning(result, 'jsx-a11y/no-access-key')
})
