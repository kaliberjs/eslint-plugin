const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(jsx-a11y/aria-unsupported-elements) should report an error for unsupported aria role', async () => {
  const result = await lint(`<meta charset="UTF-8" role="link" />`)
  assertHasWarning(result, 'jsx-a11y/aria-unsupported-elements')
})
