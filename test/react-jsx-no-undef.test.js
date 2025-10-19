const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(react/jsx-no-undef) should report an error for undefined component', async () => {
  const result = await lint(`<MyUndefinedComponent />`)
  assertHasWarning(result, 'react/jsx-no-undef')
})
