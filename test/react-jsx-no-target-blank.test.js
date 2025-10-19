const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(react/jsx-no-target-blank) should report an error for target blank without rel', async () => {
  const result = await lint(`<a href="http://example.com" target="_blank"></a>`)
  assertHasWarning(result, 'react/jsx-no-target-blank')
})
