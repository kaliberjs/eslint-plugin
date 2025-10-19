const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(jsx-a11y/html-has-lang) should report an error for html with no lang', async () => {
  const result = await lint(`<html></html>`)
  assertHasWarning(result, 'jsx-a11y/html-has-lang')
})
