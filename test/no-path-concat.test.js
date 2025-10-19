const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-path-concat) should report an error for string concatenation with __dirname or __filename', async () => {
  const result = await lint(`const fullPath = __dirname + '/file.js';`)
  assertHasWarning(result, 'no-path-concat')
})
