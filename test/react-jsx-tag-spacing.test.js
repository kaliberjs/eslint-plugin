const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(react/jsx-tag-spacing) should report an error for invalid tag spacing', async () => {
  const result = await lint(`< MyComponent />`)
  assertHasWarning(result, 'react/jsx-tag-spacing')
})
