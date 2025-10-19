const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-unexpected-multiline) should report an error for unexpected multiline', async () => {
  const result = await lint(`
    const a = 1
    [1, 2, 3].forEach(x => console.log(x))
  `)
  assertHasWarning(result, 'no-unexpected-multiline')
})
