const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(jsx-a11y/scope) should report an error for invalid scope', async () => {
  const result = await lint(`<div scope="row"></div>`)
  assertHasWarning(result, 'jsx-a11y/scope')
})
