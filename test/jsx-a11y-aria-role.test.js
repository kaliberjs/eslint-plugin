const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(jsx-a11y/aria-role) should report an error for invalid aria role', async () => {
  const result = await lint(`<div role="datepicker"></div>`)
  assertHasWarning(result, 'jsx-a11y/aria-role')
})
