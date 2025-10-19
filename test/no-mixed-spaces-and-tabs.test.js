const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-mixed-spaces-and-tabs) should report an error for mixed spaces and tabs', async () => {
  const result = await lint(`
    function main() {
	 console.log("hello");
    }
  `)

  assertHasWarning(result, 'no-mixed-spaces-and-tabs')
})
