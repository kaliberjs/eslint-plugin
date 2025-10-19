const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(jsx-a11y/heading-has-content) should report an error for heading with no content', async () => {
  const result = await lint(`<h1></h1>`)
  assertHasWarning(result, 'jsx-a11y/heading-has-content')
})
