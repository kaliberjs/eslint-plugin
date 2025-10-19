const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(jsx-a11y/img-redundant-alt) should report an error for redundant alt text', async () => {
  const result = await lint(`<img src="hello.jpg" alt="picture" />`)
  assertHasWarning(result, 'jsx-a11y/img-redundant-alt')
})
