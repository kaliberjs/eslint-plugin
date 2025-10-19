const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(jsx-a11y/aria-activedescendant-has-tabindex) should report an error for missing tabindex', async () => {
  const result = await lint(`<div aria-activedescendant="id"></div>`)
  assertHasWarning(result, 'jsx-a11y/aria-activedescendant-has-tabindex')
})
