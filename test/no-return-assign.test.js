const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-return-assign) should report an error for assignment in return', async () => {
  const result = await lint(`
    function doSomething() {
      return this.a = 2;
    }
  `)

  assertHasWarning(result, 'no-return-assign')
})
