const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-useless-constructor) should report an error for useless constructor', async () => {
  const result = await lint(`
    class A {
      constructor() {}
    }
  `)
  assertHasWarning(result, 'no-useless-constructor')
})
