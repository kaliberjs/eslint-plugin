const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(jsx-a11y/alt-text) should report an error for missing alt text', async () => {
  const result = await lint(`<img src="hello.jpg" />`)
  assertHasWarning(result, 'jsx-a11y/alt-text')
})
