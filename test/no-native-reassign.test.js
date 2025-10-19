const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-native-reassign) should report an error for reassigning native objects', async () => {
  const result = await lint(`String = 1;`)
  assertHasWarning(result, 'no-native-reassign')
})
