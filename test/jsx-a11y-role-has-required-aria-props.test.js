const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(jsx-a11y/role-has-required-aria-props) should report an error for missing required aria props', async () => {
  const result = await lint(`<div role="checkbox"></div>`)
  assertHasWarning(result, 'jsx-a11y/role-has-required-aria-props')
})
