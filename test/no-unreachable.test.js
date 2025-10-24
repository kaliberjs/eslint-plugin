const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-unreachable) should report an error for unreachable code', async () => {
  const result = await lint(`
    function foo() {
      return;
      const a = 1;
    }
  `)
  assertHasWarning(result, 'no-unreachable')
})
