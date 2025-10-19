const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(jsx-a11y/no-redundant-roles) should report an error for redundant roles', async () => {
  const result = await lint(`<button role="button"></button>`)
  assertHasWarning(result, 'jsx-a11y/no-redundant-roles')
})
