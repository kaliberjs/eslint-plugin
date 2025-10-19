const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(react/jsx-no-duplicate-props) should report an error for duplicate props', async () => {
  const result = await lint(`<MyComponent disabled disabled />`)
  assertHasWarning(result, 'react/jsx-no-duplicate-props')
})
