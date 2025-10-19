const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-return-await) should report an error for unnecessary return await', async () => {
  const result = await lint(`
    async function doSomething() {
      return await Promise.resolve(1);
    }
  `)

  assertHasWarning(result, 'no-return-await')
})
