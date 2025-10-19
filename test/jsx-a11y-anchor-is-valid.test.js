const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(jsx-a11y/anchor-is-valid) should report an error for invalid anchor', async () => {
  const result = await lint(`<a href="#"></a>`)
  assertHasWarning(result, 'jsx-a11y/anchor-is-valid')
})
