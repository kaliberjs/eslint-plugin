const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(jsx-a11y/anchor-has-content) should report an error for anchor with no content', async () => {
  const result = await lint(`<a href="http://example.com"></a>`)
  assertHasWarning(result, 'jsx-a11y/anchor-has-content')
})
