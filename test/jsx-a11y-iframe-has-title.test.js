const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(jsx-a11y/iframe-has-title) should report an error for iframe with no title', async () => {
  const result = await lint(`<iframe></iframe>`)
  assertHasWarning(result, 'jsx-a11y/iframe-has-title')
})
