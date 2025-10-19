const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(jsx-a11y/accessible-emoji) should report an error for inaccessible emoji', async () => {
  const result = await lint(`<span>👍</span>`)
  assertHasWarning(result, 'jsx-a11y/accessible-emoji')
})
