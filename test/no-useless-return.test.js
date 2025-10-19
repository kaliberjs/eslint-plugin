const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-useless-return) should report an error for useless return', async () => {
  const result = await lint(`
    function foo() {
      return;
    }
  `)
  assertHasWarning(result, 'no-useless-return')
})
