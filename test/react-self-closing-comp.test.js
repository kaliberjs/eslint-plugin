const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(react/self-closing-comp) should report an error for not self-closing', async () => {
  const result = await lint(`<MyComponent></MyComponent>`)
  assertHasWarning(result, 'react/self-closing-comp')
})
