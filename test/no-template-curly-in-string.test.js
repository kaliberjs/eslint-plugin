const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-template-curly-in-string) should report an error for template curly in string', async () => {
  const result = await lint("const a = 'hello ${world}';")
  assertHasWarning(result, 'no-template-curly-in-string')
})
