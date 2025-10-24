const { test } = require('node:test')
const { lint, assertHasFatalError } = require('./test-utils.js')

test('(no-delete-var) should report a fatal error for deleting a variable', async () => {
  const result = await lint(`
    "use strict";
    let x;
    delete x;
  `)

  assertHasFatalError(result, 'Deleting local variable in strict mode.')
})
