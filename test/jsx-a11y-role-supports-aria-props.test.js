const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(jsx-a11y/role-supports-aria-props) should report an error for unsupported aria props', async () => {
  const result = await lint(`<div role="link" aria-checked="true"></div>`)
  assertHasWarning(result, 'jsx-a11y/role-supports-aria-props')
})
